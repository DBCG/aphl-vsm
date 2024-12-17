/**
 * This worker is responsible for comparing valusets obtained from vsac and will update
 * the cqf-ruler server with its latest values if they differ from version.
 **/
import Queue from 'bull'
import FhirClient from '@/backend/clients/FhirClient'
import { terminologyClient } from 'fhirClients'
import { Bundle, BundleEntry, ValueSet } from 'fhir/r4'
import { addExtensionToVs, EXTENSIONS, isVsmAuthored } from '@/helpers/valueSetHelpers'
import { isEqualComparator, sleep } from 'utils'
import dayjs from 'dayjs'
import { getProgramDetailsValuesets } from '@/pages/api/programs/[id]/details/valuesets'
import Logger from '@/helpers/server/logger'
import { isEqualWith, set } from 'lodash'
import { QUEUE_REDIS_URL } from '@/config'
import { tsCredentialService } from '@/backend/services/TsCredentialService'
import { VSMSession } from '@/helpers/rolesHelper'

type CDRResponseCollection = {
  [url: string]: {
    cdrValueSet: ValueSet
    authorativeValueSet?: ValueSet
    authoritativeFullUrl: string
  }
}

const MAX_JOB_SIZE = 20

const valueSetUpdateQueue = new Queue<{ urls: string[]; programId: string, session: VSMSession }>('vsUpdate', `${QUEUE_REDIS_URL}`, {
  limiter: {
    max: 1,
    duration: 10000
  }
})

const findLatestValuesetVersion = (valuesets: ValueSet[]) => {
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
      const valueSets =
        bundle?.entry
          ?.filter((nestedEntry) => nestedEntry?.resource?.resourceType === 'ValueSet')
          ?.map(({ resource }) => resource as ValueSet)
          .filter((i) => !!i) || []
      if (valueSets.length > 1) {
        return findLatestValuesetVersion(valueSets)
      } else if (valueSets.length === 1) {
        return valueSets[0]
      } else {
        Logger.getLogger().error(`No ValueSets found in bundle for ${bundle.link?.[0]?.url}`)
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

  const isDifferent = !isEqualWith(cdrVsClone, authoritativeVsClone, isEqualComparator)

  return isDifferent
}

// Compare the ValueSets from the CDR and the authoritative source for differences
const gatherVsToUpdate = (toUpdateCollection: CDRResponseCollection) => {
  const upgradeRequired = [] as BundleEntry[]
  for (const url in toUpdateCollection) {
    const { cdrValueSet, authorativeValueSet, authoritativeFullUrl } = toUpdateCollection[url]
    // the full url of the resource is necessary to get it from the source server
    const authSrcUrl = authoritativeFullUrl
    const needsUpdate = compareValueSets(cdrValueSet, authorativeValueSet!, authSrcUrl)
    if (!authorativeValueSet) {
      Logger.getLogger().error(`No authoritative ValueSet found for ${cdrValueSet.id}`)
      continue
    }
    authorativeValueSet.id = cdrValueSet.id // set the id to the same cdr value set id
    if (!authorativeValueSet?.meta?.profile) {
      set(authorativeValueSet, 'meta.profile', [])
    }
    // @ts-ignore - typescript still complaining even though we are setting it if undefined
    authorativeValueSet.meta.profile = cdrValueSet?.meta?.profile // set the meta to the cdr value set meta
    const updatedAuthorativeValueSet = addExtensionToVs(authorativeValueSet!, EXTENSIONS.AUTH_SOURCE_EXTENSION_URL, authSrcUrl)
    if (needsUpdate) {
      Logger.getLogger().info(`ValueSet ${cdrValueSet.id} needs to be updated`)
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

// Executes a job batch
const executeJobBatch = async (urls: string[], refreshErrors: string[], totalUpdates: number[], session: VSMSession) => {
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
    const cdrResponse = await FhirClient.getInstance().batch({ body: batchBundle })

    const cachedCdrVS = parseCdrResponses(cdrResponse as Bundle) || []
    const toUpdateCollection: CDRResponseCollection = {}

    const endpointBundle = await FhirClient.getInstance().search({
      resourceType: 'Endpoint',
    })
  
    const endpoints = endpointBundle?.entry?.map((e: fhir4.BundleEntry) => e?.resource as fhir4.Endpoint)

    
    // Gather all the valuesets from their respective authoritive sources
    await Promise.all(
      cachedCdrVS.map(async (valueset) => {
        if (isVsmAuthored(valueset)) {
          Logger.getLogger().info(`Skipping VSM authored ValueSet ${valueset.id}`)
          return
        }

        const authSourceBase = valueset?.extension?.find(ext => ext?.url?.endsWith('valueset-authoritativeSource'))?.valueUri?.split('/ValueSet')?.[0]
        
        if (!authSourceBase) {
          refreshErrors.push(`Leaf valueset ${valueset.id} lacks supported authoritative source`)
          return
        } 

        const matchingEndpoint = endpoints?.find((e: fhir4.Endpoint) => {
          if (authSourceBase === 'http://cts.nlm.nih.gov/fhir') {
            return e?.address?.toLowerCase() === 'https://cts.nlm.nih.gov/fhir'
          } else {
            return e?.address?.toLowerCase() === authSourceBase.toLowerCase()
          }
        })

        const authCredentials = await tsCredentialService.getCredentials(session.user.id, matchingEndpoint?.id as string)
        let baseTermServerUrl = matchingEndpoint?.address?.toString()
      
        terminologyClient.setCustomClient({
          baseUrl: baseTermServerUrl,
          clientName: matchingEndpoint?.name?.toString(),
          basicAuthHeader: `${Buffer.from(`${authCredentials.username}:${authCredentials.password}`).toString('base64')}`
        })

        const targetFhirClient = terminologyClient.getClient()!

        const vsComparatorResponses = (await targetFhirClient?.search({
          resourceType: 'ValueSet',
          searchParams: { url: valueset.url!, version: valueset.version! }
        })) as fhir4.Bundle

        if (!vsComparatorResponses || vsComparatorResponses?.total == 0) {
          Logger.getLogger().error(`No ValueSets found in bundle for ${valueset.url} from authoritative source ${baseTermServerUrl}`)
          refreshErrors.push(`Refresh failed for Value Set ${valueset.id} from authoritative source ${baseTermServerUrl}`)
          return null
        }

        const authorativeValueSet = vsComparatorResponses.entry?.[0].resource as ValueSet
        const authoritativeFullUrl = authorativeValueSet.url?.replace('http://', 'https://') as string // necessary for auth source... why though?
        toUpdateCollection[valueset.url!] = {
          cdrValueSet: valueset,
          authorativeValueSet,
          authoritativeFullUrl
        }
      }).filter(i => i)
    )

    const updatesToBeMade = gatherVsToUpdate(toUpdateCollection)

    if (updatesToBeMade?.length > 0) {
      totalUpdates.push(updatesToBeMade.length)
      return FhirClient.getInstance().batch({
        body: {
          resourceType: 'Bundle',
          type: 'batch',
          entry: updatesToBeMade
        }
      })
    }
  } catch (err) {
    Logger.getLogger().error(err)
  }
}

/**
 * Job is processed here and will do a max of 20 urls at a time
 */
valueSetUpdateQueue.process(async function (job, done) {
  const { urls = [], programId, session } = job.data
  const refreshErrors: string[] = []
  const totalUpdates: number[] = [] // Store total number of updates made
  const clonedUrls = [...urls]
  if (clonedUrls?.length === 0 || programId == null) {
    Logger.getLogger().error('Urls and ProgramID required for valueset update worker')
    done()
  }
  const maxIterations = Math.ceil(clonedUrls.length / MAX_JOB_SIZE) // Scale batch number
  let iteration = 0
  Logger.getLogger().info(`Starting job id: ${job.id} with urls ${clonedUrls.length} and dividing into ${maxIterations} batches`)
  const batchedJobs = [] as any
  while (clonedUrls.length > 0) {
    const batch = await executeJobBatch(clonedUrls.splice(0, MAX_JOB_SIZE), refreshErrors, totalUpdates, session)
    if (batch) {
      batchedJobs.push(batch)
    }
    iteration += 1
    let progress = (iteration / maxIterations) * 100
    if (progress >= 100) {
      Logger.getLogger().info('Progress: 99, begin checking for update to finish')
      job.progress(99) // prevent job from finishing
      break
    } else {
      Logger.getLogger().info('Progress: ' + (iteration / maxIterations) * 100)
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
      Logger.getLogger().info('New VS ids', allBatchJobIds)
      Logger.getLogger().info('current VS ids', currentVsIds)
      if (anyIntersection?.length) {
        Logger.getLogger().info('Update finished')
        didFinishUpdate = true
        break
      } else {
        Logger.getLogger().info('Waiting for update to finish, leaf values intersection ids did not match')
        await sleep(5000)
      }
    }
  }
  job.progress(100)
  Logger.getLogger().info('job finished')
  const totalNumbOfUpdates = totalUpdates.reduce((a, b) => a + b, 0)
  done(null, { errors: refreshErrors, totalNumbOfUpdates })
})

export default valueSetUpdateQueue
