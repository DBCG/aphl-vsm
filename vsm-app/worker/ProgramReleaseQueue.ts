import Queue from 'bull'
import { Agent, fetch as f } from 'undici'
import { QUEUE_OPTIONS } from '@/config'
import FhirClient from '@/backend/clients/FhirCdrClient'
import Cache from '@/cache'
import { removeDraftFromVersionString } from '@/utils'
import { logSimpleError } from '@/helpers/server/simpleHapiError'
import { removeReleaseLabel } from '@/helpers/libraryHelpers'
import { addTerminologyEndpointToParameters } from '@/helpers/fhirResourceHelper'
import Logger from '@/helpers/server/logger'
import { ReleasePayload } from '@/components/modals/ReleaseModal'
import { JOB_STATUS } from '@/constants'

const ProgramReleaseQueue = new Queue('releaseProgram', QUEUE_OPTIONS)

type ProgramReleaseQueueJobData = {
  userId: string
} & ReleasePayload

ProgramReleaseQueue.process(async function (job: Queue.Job<ProgramReleaseQueueJobData>, done) {
  const { releaseAsVersion, programId, releaseLabel = '', latestFromTxServer, userId } = job.data
  Logger.getLogger().info('Begin Release Job for Program Id: ' + job.data.programId)

  const cache = await Cache.getInstance()
  const cacheKey = `user:${userId}:job:${job.id}`

  let program: fhir4.Library | undefined

  try {
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

    if (releaseAsVersion) {
      program.version = releaseAsVersion
    }

    const releasePayload = await addTerminologyEndpointToParameters({
      parameters: {
        resourceType: 'Parameters',
        parameter: [
          {
            name: 'version',
            valueString: removeDraftFromVersionString(program.version!)
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
    Logger.getLogger().info('Preparing for release of program id: ' + programId)

    const response = await f(url, {
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
      const errorText = await response.text()
      const error = 'Something went wrong with the release: ' + errorText
      Logger.getLogger().error(error)
      await cache.hset(cacheKey, 'status', JOB_STATUS.FAILED, 'error', error)

      try {
        const updatedProgram = removeReleaseLabel(program)
        await FhirClient.getInstance().update({
          resourceType: 'Library',
          id: programId as string,
          body: updatedProgram
        })
        Logger.getLogger().info('Removed release label due to program failure to release')
      } catch (cleanupError) {
        Logger.getLogger().error('Failed to remove release label after failed release')
      }

      done(null, { error })
    } else {
      Logger.getLogger().info('Finished')
      await cache.hset(cacheKey, 'status', JOB_STATUS.COMPLETED)
      return done(null, { response: 'Finished' })
    }
  } catch (e: any) {
    const error = e?.message || 'Unknown error during release'
    Logger.getLogger().error('Release job failed with unhandled error: ' + error)
    await cache.hset(cacheKey, 'status', JOB_STATUS.FAILED, 'error', error)

    if (program) {
      try {
        const updatedProgram = removeReleaseLabel(program)
        await FhirClient.getInstance().update({
          resourceType: 'Library',
          id: programId as string,
          body: updatedProgram
        })
        Logger.getLogger().info('Removed release label after unhandled release failure')
      } catch (cleanupError) {
        Logger.getLogger().error('Failed to remove release label after unhandled failure')
      }
    }

    done(null, { error })
  }
})

export default ProgramReleaseQueue