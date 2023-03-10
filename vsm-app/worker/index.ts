/**
 * This worker is responsible for comparing valusets obtained from vsac and will update
 * the cqf-ruler server with its latest values if they differ from version.
 **/
import Queue from "bull"
import { fhirCdrClient, terminologyClient as termClient } from "fhirClients"
import {
  Bundle,
  BundleEntry,
  ValueSet,
  UsageContext,
} from "fhir/r4"
import { is } from "@/helpers/is"
import { getTerminologySource } from "@/helpers/valueSetHelpers"
import { sleep } from "utils"
import moment from "moment"

type CDRResponseCollection = {
  [url: string]: {
    valuesets: ValueSet[]
    latestVersion?: string
    latestVersionUseContext?: UsageContext[]
    versions: string[]
    vsComparatorResponses?: Bundle
  }
}

const REDIS_HOST = process.env.REDIS_HOST || "127.0.0.1"
const MAX_JOB_SIZE = 20

const valueSetUpdateQueue = new Queue<{ urls: string[] }>(
  "vsUpdate",
  `redis://${REDIS_HOST}:6379`,
  {
    limiter: {
      max: 1,
      duration: 10000,
    },
  }
)

/**
 * Builds Bundle Entry for batch request
 */
const buildValueSetEntry = (
  bundleWithVersions: fhir4.Resource[],
  useContext: UsageContext[],
  url: string
) => {
  const entry = bundleWithVersions.flatMap((valueSet) => {
    if (is.valueSet(valueSet)) {
      return {
        resource: {
          ...valueSet,
          useContext,
          url
        },
        request: {
          method: "POST",
          url: `/ValueSet`,
        },
      } as BundleEntry
    } else {
      console.log("No updated required for url", url)
      return null
    }
  }).filter(i => i)
  return entry as BundleEntry
}

/**
 * Parses the responses from the targeted terminology server and checks to see if there
 * are any new versions of the ValueSet. If there are, it will return a BundleEntry
 * with the new ValueSet resource to be added to the CQF Ruler server.
 */
const parseVSComparatorResponses = (cdrResponseCollection: CDRResponseCollection) => {
  const entries: BundleEntry[] = []
  Object.keys(cdrResponseCollection).forEach((url) => {
    const { versions, latestVersion, latestVersionUseContext, vsComparatorResponses } = cdrResponseCollection[url]
    if (latestVersion == null || latestVersionUseContext == null) {
      console.error(`latestVersion or latestVersionUseContext not found for ValueSet at ${url}`)
      return
    }
    // Find all the versions which are not in the local CQF instance
    const vsComparatorResponsesWithVersions = vsComparatorResponses?.entry?.map((bundleEntry: BundleEntry) => {
      const resource = bundleEntry.resource as ValueSet
      if (resource?.version && is.valueSet(resource) && !versions?.includes(resource.version)) {
        console.log(`Adding new resource found: ${resource.name} version: ${resource.version}`)
        return resource
      }
    }).filter(i => !!i) as ValueSet[] || [] //filter out undefined

    if (vsComparatorResponsesWithVersions?.length === 0) return

    const entry = buildValueSetEntry(
      vsComparatorResponsesWithVersions,
      latestVersionUseContext,
      url
    )
    if (entry != null) entries.push(entry)
  })
  return entries.flat()
}

/**
 * Parse the CDR response and return a collection of ValueSets grouped by url
 * and pins the latest version valueset and its useContext
 */
const parseCdrResponses = (cdrResponse: Bundle) => {
  const cdrResponseCollection: CDRResponseCollection = {}

  cdrResponse?.entry?.forEach((cdrBundle: BundleEntry) => {
    const bundle = cdrBundle?.resource as Bundle
    const valueSets = bundle?.entry?.map(({ resource }) => resource as ValueSet).filter(i => !!i)
    valueSets?.forEach((valueSet) => {
      const { url, version, useContext } = valueSet
      if (!url || !version || !useContext) {
        console.error(
          `url, version, or useContext not found for ValueSet at ${url}`
        )
        return
      }

      if (cdrResponseCollection[url]) {
        cdrResponseCollection[url].valuesets.push(valueSet)
        cdrResponseCollection[url].versions.push(version)
        // Set the latest version and useContext
        if (
          valueSet.useContext &&
          moment(version) > moment(cdrResponseCollection[url].latestVersion)
        ) {
          cdrResponseCollection[url].latestVersion = version
          cdrResponseCollection[url].latestVersionUseContext =
            valueSet.useContext
        }
      } else {
        cdrResponseCollection[url] = { valuesets: [valueSet], versions: [version] }
        if (valueSet.useContext) {
          cdrResponseCollection[url].latestVersion = version
          cdrResponseCollection[url].latestVersionUseContext = useContext
        }
      }
    })
  })
  return cdrResponseCollection
}

const executeJobBatch = async (urls: string[]) => {
  const batchBundle: Bundle & { type: "batch" } = {
    resourceType: "Bundle",
    type: "batch",
    entry: urls.map((url: string) => {
      return {
        request: {
          method: "GET",
          url: `/ValueSet?url=${url}`,
        },
      }
    }),
  }

  try {
    // Gather request to CQF server for the ValueSets in local CQF instance
    const cdrResponse = await fhirCdrClient.batch({
      body: batchBundle,
    })

    // Collect Versions and Latest UseContext to be applied
    const cdrResponseCollection = parseCdrResponses(cdrResponse as Bundle)

    // Gather all bundles for batch creation
    await Promise.all(Object.keys(cdrResponseCollection).map(async (url) => {
        const { valuesets } = cdrResponseCollection[url]
        let serverType: "vsac" | "ontoserverR4" = "vsac"
        const { value } = getTerminologySource(valuesets[0]) //fetch the terminology server

        switch (value) {
          case "https://cts.nlm.nih.gov/fhir":
            serverType = "vsac"
            break
          // case 'https://r4.ontoserver.csiro.au/fhir':  ### NOT SUPPORTED ###
          //   serverType = 'ontoserverR4'
          //   break;
          default:
            // default will also be vsac
            break
        }

        termClient.setClient(serverType)
        const targetFhirClient = termClient.getClient()!

        const vsComparatorResponses = await targetFhirClient?.search({
          resourceType: "ValueSet",
          searchParams: { url: url },
        }) as fhir4.Bundle

        cdrResponseCollection[url].vsComparatorResponses = vsComparatorResponses
    }))

    const entry = parseVSComparatorResponses(cdrResponseCollection)

    if (entry?.length > 0) {
      return fhirCdrClient.batch({
        body: {
          resourceType: "Bundle",
          type: "batch",
          entry
        }
      })
    }
  } catch (err) {
    console.error(err)
  }
}

/**
 * Job is processed here and will do a max of 20 urls at a time
 */
valueSetUpdateQueue.process(async function (job, done) {
  const { urls = [] } = job.data
  const clonedUrls = [...urls]
  if (clonedUrls?.length === 0) {
    console.error("No urls provided for valueset update worker")
    done()
  }
  const maxIterations = Math.floor(clonedUrls.length / MAX_JOB_SIZE) + 1
  let iteration = 0
  console.log(`Starting job: ${job.id} urls and dividing into ${maxIterations} batches`)
  while (clonedUrls.length > 0) {
    await executeJobBatch(clonedUrls.splice(0, MAX_JOB_SIZE))
    iteration += 1
    console.log("Progress:", (iteration / maxIterations) * 100)
    job.progress((iteration / maxIterations) * 100)
    await sleep(5000)
  }
  console.log("job finished")
  job.progress(100)
  done()
})

export default valueSetUpdateQueue
