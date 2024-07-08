/**
 * This worker is responsible for comparing valusets obtained from vsac and will update
 * the cqf-ruler server with its latest values if they differ from version.
 **/
import Queue from 'bull'
import { fhirCdrClient, terminologyClient as termClient } from 'fhirClients'
import { Bundle, BundleEntry, ValueSet, UsageContext } from 'fhir/r4'
import { is } from '@/helpers/is'
import { getTerminologySource, idWithoutVersion } from '@/helpers/valueSetHelpers'
import { sleep } from 'utils'
import dayjs from 'dayjs'
import { getProgramDetailsValuesets } from '@/pages/api/programs/[id]/details/valuesets'
import logger from '@/helpers/server/logger'

type CDRResponseCollection = {
  [url: string]: {
    valuesets: ValueSet[]
    latestVersion?: string
    latestVersionUseContext?: UsageContext[]
    versions: string[]
    vsComparatorResponses?: Bundle
  }
}

const REDIS_HOST = process.env.REDIS_HOST
const REDIS_DB = process.env.REDIS_DB
const MAX_JOB_SIZE = 20

const valueSetUpdateQueue = new Queue<{ urls: string[]; programId: string }>('vsUpdate', `redis://${REDIS_HOST}:6379/${REDIS_DB}`, {
  limiter: {
    max: 1,
    duration: 10000
  }
})

/**
 * Builds Bundle Entry for batch request
 */
const buildValueSetEntry = (bundleWithVersions: fhir4.Resource[], useContext: UsageContext[], url: string) => {
  const entry = bundleWithVersions
    .flatMap((valueSet) => {
      if (is.valueSet(valueSet)) {
        return {
          resource: {
            ...valueSet,
            useContext,
            url
          },
          request: {
            method: 'POST',
            url: `/ValueSet`
          }
        } as BundleEntry
      } else {
        logger.info('No update required for url', url)
        return null
      }
    })
    .filter((i) => i)
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
      logger.error(`latestVersion or latestVersionUseContext not found for ValueSet at ${url}`)
      return
    }
    // Find if latest version is not in cqf store
    const vsComparatorResponsesWithVersions =
      (vsComparatorResponses?.entry
        ?.map((bundleEntry: BundleEntry) => {
          const resource = bundleEntry.resource as ValueSet
          if (resource?.version && is.valueSet(resource) && dayjs(resource.version).isAfter(latestVersion)) {
            logger.info(`Adding new resource, latest version found for: ${resource.name} version: ${resource.version}`)
            return resource
          }
        })
        .filter((i) => !!i) as ValueSet[]) || [] //filter out undefined

    if (vsComparatorResponsesWithVersions?.length === 0) return

    const entry = buildValueSetEntry(vsComparatorResponsesWithVersions, latestVersionUseContext, url)
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
    const valueSets = bundle?.entry?.map(({ resource }) => resource as ValueSet).filter((i) => !!i)
    valueSets?.forEach((valueSet) => {
      const { url, version, useContext } = valueSet
      if (!url || !version || !useContext) {
        logger.error(`url, version, or useContext not found for ValueSet at ${url}`)
        return
      }

      if (cdrResponseCollection[url]) {
        cdrResponseCollection[url].valuesets.push(valueSet)
        cdrResponseCollection[url].versions.push(version)
        // Set the latest version and useContext
        if (valueSet.useContext && dayjs(version).isAfter(cdrResponseCollection[url].latestVersion)) {
          cdrResponseCollection[url].latestVersion = version
          cdrResponseCollection[url].latestVersionUseContext = valueSet.useContext
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

const executeJobBatch = async (urls: string[], refreshErrors: string[]) => {
  const batchBundle: Bundle & { type: 'batch' } = {
    resourceType: 'Bundle',
    type: 'batch',
    entry: urls.map((url: string) => {
      return {
        request: {
          method: 'GET',
          url: `/ValueSet?url=${idWithoutVersion(url)}`
        }
      }
    })
  }

  try {
    // Gather request to CQF server for the ValueSets in local CQF instance
    const cdrResponse = await fhirCdrClient.batch({
      body: batchBundle
    })

    // Collect Versions and Latest UseContext to be applied
    const cdrResponseCollection = parseCdrResponses(cdrResponse as Bundle)

    // Gather all bundles for batch creation
    await Promise.all(
      Object.keys(cdrResponseCollection).map(async (url) => {
        const { valuesets } = cdrResponseCollection[url]
        let serverType: 'vsac' | 'ontoserverR4' = 'vsac'
        const { value } = getTerminologySource(valuesets[0], refreshErrors) //fetch the terminology server

        switch (value) {
          case 'https://cts.nlm.nih.gov/fhir':
            serverType = 'vsac'
            break
          case 'Ontoserver (R4)':
            refreshErrors.push(`Authoritative Source ${value} for Value Set ${valuesets[0].id} is currently unsupported`)
             break;
          default:
            // default will also be vsac
            break
        }

        termClient.setClient(serverType)
        const targetFhirClient = termClient.getClient()!

        const vsComparatorResponses = (await targetFhirClient?.search({
          resourceType: 'ValueSet',
          searchParams: { url: idWithoutVersion(url) }
        })) as fhir4.Bundle

        if (!vsComparatorResponses || vsComparatorResponses?.total == 0) {
          refreshErrors.push(`Refresh failed for Value Set ${valuesets[0].id}`)
        }

        cdrResponseCollection[url].vsComparatorResponses = vsComparatorResponses
      })
    )

    const entry = parseVSComparatorResponses(cdrResponseCollection)

    if (entry?.length > 0) {
      return fhirCdrClient.batch({
        body: {
          resourceType: 'Bundle',
          type: 'batch',
          entry
        }
      })
    }
  } catch (err) {
    logger.error(err)
  }
}

/**
 * Job is processed here and will do a max of 20 urls at a time
 */
valueSetUpdateQueue.process(async function (job, done) {
  const { urls = [], programId } = job.data
  const refreshErrors: string[] = []
  const clonedUrls = [...urls]
  if (clonedUrls?.length === 0 || programId == null) {
    logger.error('Urls and ProgramID required for valueset update worker')
    done()
  }
  const maxIterations = Math.floor(clonedUrls.length / MAX_JOB_SIZE) + 1
  let iteration = 0
  logger.info(`Starting job: ${job.id} urls and dividing into ${maxIterations} batches`)
  const batchedJobs = [] as any
  while (clonedUrls.length > 0) {
    const batch = await executeJobBatch(clonedUrls.splice(0, MAX_JOB_SIZE), refreshErrors)
    if (batch) {
      batchedJobs.push(batch)
    }
    iteration += 1
    let progress = (iteration / maxIterations) * 100
    if (progress >= 100) {
      logger.info('Progress: 99, begin checking for update to finish')
      job.progress(99) // prevent job from finishing
      break
    } else {
      logger.info('Progress: ' +(iteration / maxIterations) * 100)
      job.progress(progress)
      await sleep(5000)
    }
  }

  // TODO: need to implement below
  // const MAX_ITERATIONS = 30 // Stop checking after 30 iterations,
  // this handles the edge case where the valueset number may have
  // changed to less than the original count of urls it started with

  // If batch jobs were actually run, check and wait for job to finish
  if (batchedJobs?.length > 0) {
    const allBatchJobIds: string[] = []
    for (const job of batchedJobs) {
      job?.entry?.forEach((i: any) => allBatchJobIds.push(i?.response?.location?.split('/')[1]))
    }

    let didFinishUpdate = false
    while (!didFinishUpdate) {
      const { payload } = await getProgramDetailsValuesets({ id: programId })
      // @ts-ignore
      const currentVsIds: string[] = payload?.data?.map((i) => i?.valueSet?.id) || []

      // Some Ids should intersect since from the UI side they are sent to be updated to latest here in the worker
      const anyIntersection = currentVsIds.filter((value) => allBatchJobIds.includes(value))
      logger.info('New VS ids', allBatchJobIds)
      logger.info('current VS ids', currentVsIds)
      if (anyIntersection?.length) {
        logger.info('Update finished')
        didFinishUpdate = true
        break
      } else {
        logger.info('Waiting for update to finish, leaf values intersection ids did not match')
        await sleep(5000)
      }
    }
  }
  job.progress(100)
  logger.info('job finished')
  done(null, {errors: refreshErrors})
})

export default valueSetUpdateQueue
