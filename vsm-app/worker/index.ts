/**
 * This worker is responsible for comparing valusets obtained from vsac and will update
 * the cqf-ruler server with its latest values if they differ from version.
 **/
import Queue from 'bull'
import { fhirCdrClient, terminologyClient as termClient } from 'fhirClients'
import { Bundle, BundleEntry, ValueSet } from 'fhir/r4'
import { addExtensionToVs, EXTENSIONS, getTerminologySource } from '@/helpers/valueSetHelpers'
import { deepEqual, sleep } from 'utils'
import dayjs from 'dayjs'
import { getProgramDetailsValuesets } from '@/pages/api/programs/[id]/details/valuesets'
import logger from '@/helpers/server/logger'
import { getTerminologySourceEndpoint } from '@/fhirClientOptions'
import { set } from 'lodash'

type CDRResponseCollection = {
  [url: string]: {
    cdrValueSet: ValueSet
    authorativeValueSet?: ValueSet
    terminologySource: string
  }
}

const REDIS_HOST = process.env.REDIS_HOST
const REDIS_DB = process.env.REDIS_DB
const MAX_JOB_SIZE = 20

const valueSetUpdateQueue = new Queue<{ urls: string[]; programId: string }>('vsUpdate', `redis://${REDIS_HOST}:6379/${REDIS_DB}`, {
  limiter: {
    max: 1,
    duration: 10000
  },
  redis: {
    tls: {rejectUnauthorized: false},
    enableTLSForSentinelMode: false
  }
})

const findLatestVersionValueSet = (valuesets: ValueSet[]) => {
  let latestVersion = valuesets[0]
  valuesets.forEach((valueSet) => {
    if (dayjs(valueSet.version).isAfter(latestVersion.version)) {
      latestVersion = valueSet
    }
  })
  return latestVersion
}

/**
 * Parse the CDR response and return a collection of ValueSets grouped by url
 * and pins the latest version valueset and its useContext
 */
const parseCdrResponses = (cdrResponse: Bundle) => {
  return cdrResponse?.entry
    ?.filter((entry) => entry?.resource?.resourceType === 'Bundle')
    ?.map((cdrBundle: BundleEntry) => {
      const bundle = cdrBundle?.resource as Bundle
      const valueSets = bundle?.entry
      ?.filter((nestedEntry) => nestedEntry?.resource?.resourceType === 'ValueSet')
      ?.map(({ resource }) => resource as ValueSet).filter((i) => !!i) || []
      if (valueSets.length > 1) {
        return findLatestVersionValueSet(valueSets)
      } else if (valueSets.length === 1) {
        return valueSets[0]
      } else {
        logger.error(`No ValueSets found in bundle for ${bundle.link?.[0]?.url}`)
        return
      }
    })
    .filter((i) => i) as ValueSet[]
}

const compareValueSets = (cdrVs: ValueSet, authoritativeVs: ValueSet, authSrcUrl: string) => {
  let authoritativeVsClone = JSON.parse(JSON.stringify(authoritativeVs))
  // delete these values so comparison is accurate
  delete authoritativeVsClone.meta
  delete authoritativeVsClone.id
  delete authoritativeVsClone.text
  authoritativeVsClone = addExtensionToVs(authoritativeVsClone, EXTENSIONS.AUTH_SOURCE_EXTENSION_URL, authSrcUrl)

  const cdrVsClone = JSON.parse(JSON.stringify(cdrVs))
  // delete these values so comparison is accurate
  delete cdrVsClone.meta
  delete cdrVsClone.id
  delete cdrVsClone.text
  
  const isDifferent = !deepEqual(cdrVsClone, authoritativeVsClone)

  return isDifferent
}

// Compare the ValueSets from the CDR and the authoritative source for differences
const gatherVsToUpdate = (toUpdateCollection: CDRResponseCollection) => {
  const upgradeRequired = [] as BundleEntry[]
  for (const url in toUpdateCollection) {
    const { cdrValueSet, authorativeValueSet, terminologySource } = toUpdateCollection[url]
    const authSrcUrl = getTerminologySourceEndpoint(terminologySource) as unknown as string
    const needsUpdate = compareValueSets(cdrValueSet, authorativeValueSet!, authSrcUrl)
    if (!authorativeValueSet) {
      logger.error(`No authoritative ValueSet found for ${cdrValueSet.id}`)
      continue;
    }
    authorativeValueSet.id = cdrValueSet.id // set the id to the same cdr value set id
    if (!authorativeValueSet?.meta?.profile) {
      set(authorativeValueSet, 'meta.profile', [])
    }
    // @ts-ignore - typescript still complaining even though we are setting it if undefined
    authorativeValueSet.meta.profile = cdrValueSet?.meta?.profile // set the meta to the cdr value set meta
    const updatedAuthorativeValueSet = addExtensionToVs(authorativeValueSet!, EXTENSIONS.AUTH_SOURCE_EXTENSION_URL, authSrcUrl)
    if (needsUpdate) {
      logger.info(`ValueSet ${cdrValueSet.id} needs to be updated`)
      upgradeRequired.push({
        resource: updatedAuthorativeValueSet,
        request: {
          method: 'PUT',
          url: `/ValueSet/${cdrValueSet.id}`
        }
      })
    }
  }
  return upgradeRequired
}

const executeJobBatch = async (urls: string[], refreshErrors: string[]) => {
  const batchBundle: Bundle & { type: 'batch' } = {
    resourceType: 'Bundle',
    type: 'batch',
    entry: urls.map((startUrl: string) => {
      const [vsUrl, version] = startUrl.split('|')
      let url = `/ValueSet?url=${vsUrl}`
      if (version) {
        url = `/ValueSet?url=${vsUrl}&version=${version}`
      }
      return {
        request: {
          method: 'GET',
          url
        }
      }
    })
  }

  try {
    // Gather request to CQF server for the ValueSets in local CQF instance
    const cdrResponse = await fhirCdrClient.batch({ body: batchBundle })

    const cachedCdrVS = parseCdrResponses(cdrResponse as Bundle) || []
    const toUpdateCollection = {} as CDRResponseCollection
    // Gather all the valuesets from their respective authorative sources
    await Promise.all(
      cachedCdrVS.map(async (valueset) => {
        let serverType: 'vsac' | 'ontoserverR4' = 'vsac'
        const { value } = getTerminologySource(valueset, refreshErrors) //fetch the terminology server

        switch (value) {
          case 'https://cts.nlm.nih.gov/fhir':
            serverType = 'vsac'
            break
          case 'Ontoserver (R4)':
            refreshErrors.push(`Authoritative Source ${value} for Value Set ${valueset.id} is currently unsupported`)
            break
          default:
            // default will also be vsac
            break
        }

        termClient.setClient(serverType)
        const targetFhirClient = termClient.getClient()!

        const vsComparatorResponses = (await targetFhirClient?.search({
          resourceType: 'ValueSet',
          searchParams: { url: valueset.url!, version: valueset.version! }
        })) as fhir4.Bundle

        if (!vsComparatorResponses || vsComparatorResponses?.total == 0) {
          logger.error(`No ValueSets found in bundle for ${valueset.url} from authoritative source ${value}`)
          refreshErrors.push(`Refresh failed for Value Set ${valueset.id} from authoritative source ${value}`)
          return null
        }

        const authorativeValueSet = vsComparatorResponses.entry?.[0].resource as ValueSet
        toUpdateCollection[valueset.url!] = {
          cdrValueSet: valueset,
          authorativeValueSet,
          terminologySource: value
        }
      })
    )

    const updatesToBeMade = gatherVsToUpdate(toUpdateCollection)

    if (updatesToBeMade?.length > 0) {
      return fhirCdrClient.batch({
        body: {
          resourceType: 'Bundle',
          type: 'batch',
          entry: updatesToBeMade
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
  const maxIterations = Math.ceil(clonedUrls.length / MAX_JOB_SIZE) // Scale batch number
  let iteration = 0
  logger.info(`Starting job id: ${job.id} with urls ${clonedUrls.length} and dividing into ${maxIterations} batches`)
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
      logger.info('Progress: ' + (iteration / maxIterations) * 100)
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
  done(null, { errors: refreshErrors })
})

export default valueSetUpdateQueue
