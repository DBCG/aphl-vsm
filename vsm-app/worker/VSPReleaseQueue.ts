import Queue from 'bull'
import { Agent, fetch as f } from 'undici'
import { QUEUE_REDIS_URL } from '@/config'
import FhirClient from '@/backend/clients/FhirCdrClient'
import Cache from '@/cache'
import { logSimpleError } from '@/helpers/server/simpleHapiError'
import { tsCredentialService } from '@/backend/services/TsCredentialService'
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

  const releasePayload: fhir4.Parameters = {
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
        valueBoolean: true
      }
    ]
  }

  // Add terminology endpoint with Basic auth header if VSAC credentials are available
  try {
    const vsCreds = await tsCredentialService.getVsacCredentials(userId)
    const basicAuth = Buffer.from(`${vsCreds.username}:${vsCreds.password}`).toString('base64')
    releasePayload.parameter!.push({
      name: 'terminologyEndpoint',
      resource: {
        resourceType: 'Endpoint',
        status: 'active',
        connectionType: {
          system: 'http://hl7.org/fhir/ValueSet/endpoint-connection-type',
          code: 'hl7-fhir-rest'
        },
        header: [`Authorization: Basic ${basicAuth}`],
        address: process.env.NEXT_PUBLIC_VSAC_BASE_URL || 'https://cts.nlm.nih.gov/fhir',
        payloadType: [{
          coding: [{
            system: 'http://hl7.org/fhir/ValueSet/endpoint-payload-type',
            code: 'any'
          }]
        }]
      } as fhir4.Endpoint
    })
  } catch {
    // No credentials stored — proceed without terminology endpoint
    Logger.getLogger().info(`No VSAC credentials found for user ${userId}, proceeding without terminologyEndpoint`)
  }

  const url = `${FhirClient.getInstance().baseUrl}/Library/${vspId}/$release-manifest`
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

  Logger.getLogger().info(`$release-manifest responded with status: ${response.status}`)

  if (!response.ok) {
    const errorText = await response.text();
    const error = 'Something went wrong with the release: ' + errorText
    Logger.getLogger().error(error)
    await cache.hset(cacheKey, 'status', JOB_STATUS.FAILED, 'error', error)
    done(null, { error })
  } else {
    // Parse the response Library and update the VSP's expansion parameters
    try {
      const result = await response.json() as fhir4.Library
      const expansionParams = result?.contained?.find(
        (r) => r.resourceType === 'Parameters' && r.id === 'expansion-parameters'
      ) as fhir4.Parameters | undefined

      if (expansionParams) {
        // Re-read the VSP to get the latest version (may have been updated by date-setting above)
        const currentVsp = (await FhirClient.getInstance().read({
          resourceType: 'Library',
          id: vspId
        })) as fhir4.Library

        // Replace the contained expansion-parameters-vsp with the resolved one
        expansionParams.id = 'expansion-parameters-vsp'
        const filteredContained = currentVsp.contained?.filter((r) => r.id !== 'expansion-parameters-vsp') || []
        filteredContained.push(expansionParams)
        currentVsp.contained = filteredContained

        // Ensure the extension reference exists
        const hasExpansionExt = currentVsp.extension?.some(
          (ext) => ext.url === 'http://hl7.org/fhir/StructureDefinition/cqf-expansionParameters'
        )
        if (!hasExpansionExt) {
          currentVsp.extension = [
            ...(currentVsp.extension || []),
            {
              url: 'http://hl7.org/fhir/StructureDefinition/cqf-expansionParameters',
              valueReference: { reference: '#expansion-parameters-vsp' }
            }
          ]
        }

        await FhirClient.getInstance().update({
          resourceType: 'Library',
          id: vspId,
          body: currentVsp
        })
        Logger.getLogger().info(`Updated VSP ${vspId} manifest with resolved expansion parameters`)
      } else {
        Logger.getLogger().warn(`$release-manifest response did not contain expansion-parameters for VSP ${vspId}`)
      }
    } catch (e) {
      logSimpleError(e)
      Logger.getLogger().error(`Failed to update VSP ${vspId} manifest with release-manifest results`)
      // Don't fail the job — the release itself succeeded
    }

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
