import Queue from 'bull'
import { Agent, fetch as f } from 'undici'
import { QUEUE_REDIS_URL } from '@/config'
import FhirClient from '@/backend/clients/FhirCdrClient'
import Cache from '@/cache'
import { logSimpleError } from '@/helpers/server/simpleHapiError'
import { addTerminologyEndpointToParameters } from '@/helpers/fhirResourceHelper'
import Logger from '@/helpers/server/logger'
import { JOB_STATUS } from '@/constants'

const VSPReleaseQueue = new Queue('releaseVSP', QUEUE_REDIS_URL)

type VSPReleaseQueueJobData = {
  vspId: string
  latestFromTxServer: boolean
  userId: string
}

VSPReleaseQueue.process(async function (job: Queue.Job<VSPReleaseQueueJobData>, done) {
  const { vspId, latestFromTxServer, userId } = job.data
  Logger.getLogger().info('Begin Release Job for VSP Id: ' + vspId)

  const cache = await Cache.getInstance()
  const cacheKey = `user:${userId}:job:${job.id}`

  try {

  let vsp: fhir4.Library | undefined
  try {
    vsp = (await FhirClient.getInstance().read({
      resourceType: 'Library',
      id: vspId
    })) as fhir4.Library
  } catch (e) {
    logSimpleError(e)
  }
  if (vsp == null) {
    const error = 'Error encountered fetching Library for release'
    await cache.hset(cacheKey, 'status', JOB_STATUS.FAILED, 'error', error)
    done(null, { error })
    return
  }

  // $release requires Library.date (last modified date) and approvalDate to be set
  const today = new Date().toISOString().split('T')[0]
  if (!vsp.date || !vsp.approvalDate) {
    if (!vsp.date) vsp.date = today
    if (!vsp.approvalDate) vsp.approvalDate = today
    try {
      await FhirClient.getInstance().update({
        resourceType: 'Library',
        id: vspId,
        body: vsp
      })
      Logger.getLogger().info(`Set date and approvalDate on VSP ${vspId} before release`)
    } catch (e) {
      logSimpleError(e)
      const error = 'Error encountered setting dates on Library before release'
      await cache.hset(cacheKey, 'status', JOB_STATUS.FAILED, 'error', error)
      done(null, { error })
      return
    }
  }

  const releasePayload = await addTerminologyEndpointToParameters({
    parameters: {
      resourceType: 'Parameters',
      parameter: [
        {
          name: 'version',
          valueString: vsp.version!
        },
        {
          name: 'versionBehavior',
          valueCode: 'force'
        },
        {
          name: 'latestFromTxServer',
          valueBoolean: latestFromTxServer
        }
      ]
    },
    userId
  })

  const url = `${FhirClient.getInstance().baseUrl}/Library/${vspId}/$release`
  Logger.getLogger().info('Preparing for release of VSP id: ' + vspId)

  let response = await f(url, {
    body: JSON.stringify(releasePayload),
    method: 'POST',
    dispatcher: new Agent({
      connectTimeout: 24 * 60 * 60 * 1000,
      headersTimeout: 24 * 60 * 60 * 1000,
      keepAliveTimeout: 24 * 60 * 60 * 1000,
      keepAliveMaxTimeout: 24 * 60 * 60 * 1000
    }),
    // @ts-ignore
    headers: {
      ...FhirClient.getInstance().customHeaders,
      'Content-Type': 'application/fhir+json'
    }
  })

  Logger.getLogger().info(`$release responded with status: ${response.status}`)

  if (!response.ok) {
    const errorText = await response.text();
    const error = 'Something went wrong with the release: ' + errorText
    Logger.getLogger().error(error)
    await cache.hset(cacheKey, 'status', JOB_STATUS.FAILED, 'error', error)
    done(null, { error })
  } else {
    Logger.getLogger().info('Finished')
    await cache.hset(cacheKey, 'status', JOB_STATUS.COMPLETED)
    return done(null, { response: "Finished" })
  }

  } catch (e: any) {
    const error = e?.message || 'Unknown error during release'
    Logger.getLogger().error('Release job failed with unhandled error: ' + error)
    await cache.hset(cacheKey, 'status', JOB_STATUS.FAILED, 'error', error)
    done(null, { error })
  }
})

export default VSPReleaseQueue
