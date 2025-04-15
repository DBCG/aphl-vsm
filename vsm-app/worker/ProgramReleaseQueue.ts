import Queue from 'bull'
import { Agent, fetch as f } from 'undici'
import { QUEUE_REDIS_URL } from '@/config'
import FhirClient from '@/backend/clients/FhirCdrClient'
import Cache from '@/cache'
import { removeDraftFromVersionString } from '@/utils'
import { logSimpleError } from '@/helpers/server/simpleHapiError'
import {
  getReleaseDescription,
  getReleaseLabel,
  setReleaseDescription,
  setEffectivePeriodStart,
  setReleaseLabel,
  removeReleaseLabel
} from '@/helpers/libraryHelpers'
import { addTerminologyEndpointToParameters } from '@/helpers/fhirResourceHelper'
import Logger from '@/helpers/server/logger'
import { ReleasePayload } from '@/components/modals/ReleaseModal'
import { JOB_STATUS } from '@/constants'

const ProgramReleaseQueue = new Queue('releaseProgram', QUEUE_REDIS_URL)

type ProgramReleaseQueueJobData = {
  userId: string
} & ReleasePayload

ProgramReleaseQueue.process(async function (job: Queue.Job<ProgramReleaseQueueJobData>, done) {
  const { releaseAsVersion, programId, releaseDescription = '', releaseLabel = '', effectiveStartDate, latestFromTxServer, userId } = job.data
  Logger.getLogger().info('Begin Release Job for Program Id: ' + job.data.programId)
  
  const cache = await Cache.getInstance()
  const cacheKey = `user:${userId}:job:${job.id}`  
  
  let program: fhir4.Library | undefined
  try {
    program = (await FhirClient.getInstance().read({
      resourceType: 'Library',
      id: programId as string
    })) as fhir4.Library
  } catch (e) {
    logSimpleError(e)
  }
  if (program == null) {
    const error = 'Error encountered fetching Library for release'
    await cache.hset(cacheKey, 'status', JOB_STATUS.FAILED, 'error', error)
    done(null, { error })
    return
  }

  if (!!releaseAsVersion) {
    program.version = releaseAsVersion
  }

  const releasePayload = await addTerminologyEndpointToParameters({
    parameters: {
      resourceType: 'Parameters',
      parameter: [
        {
          name: 'version',
          valueString: removeDraftFromVersionString(program?.version!)
        },
        {
          name: 'versionBehavior',
          valueCode: 'force'
        },
        {
          name: 'latestFromTxServer',
          valueBoolean: latestFromTxServer
        },
        {
          name: 'releaseLabel',
          valueString: releaseLabel
        }
      ]
    },
    userId
  })

  const url = `${FhirClient.getInstance().baseUrl}/Library/${programId as string}/$release`
  Logger.getLogger().info('Preparing for release of program id: '+ programId)
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
      'Content-Type': 'application/fhir+json',
      ...FhirClient.getInstance().customHeaders
    }
  })

  if (!response.ok) {
    const errorText = await response.text();
    const error = 'Something went wrong with the release: ' + errorText
    Logger.getLogger().error(error)
    await cache.hset(cacheKey, 'status', JOB_STATUS.FAILED, 'error', error)

    // TODO: Do we need to clean anything up in case of failures?
    // removeReleaseLabel(program)
    // await FhirClient.getInstance().update({
    //   resourceType: 'Library',
    //   id: programId as string,
    //   body: program
    // })
    Logger.getLogger().info('Removed release label due to program failure to release')
    done(null, { error })
  } else {
    Logger.getLogger().info('Finished')
    await cache.hset(cacheKey, 'status', JOB_STATUS.COMPLETED)
    return done(null, { response: "Finished" })
  }
})

export default ProgramReleaseQueue