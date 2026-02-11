import { QUEUE_REDIS_URL } from '@/config'
import Cache from '@/cache'
import { JOB_STATUS } from '@/constants'
import FhirClient from '@/backend/clients/FhirCdrClient'
import Logger from '@/helpers/server/logger'
import Queue from 'bull'
import { tsCredentialService } from '@/backend/services/TsCredentialService'

const VSPPackageQueue = new Queue('vspPackage', QUEUE_REDIS_URL)

interface VSPPackageJobData {
  vspId: string
  isJson: boolean
  userId: string
}

/**
 * Worker to call $package operation on a VSP Library
 * The $package operation returns a Bundle containing the VSP and all referenced resources
 */
VSPPackageQueue.process(async function (job: any, done) {
  Logger.getLogger().info('='.repeat(80))
  Logger.getLogger().info('Begin VSP Package Job')
  Logger.getLogger().info(`Job ID: ${job.id}`)
  Logger.getLogger().info(`Raw job.data:`, JSON.stringify(job.data))

  const { vspId, isJson, userId } = job.data as VSPPackageJobData
  Logger.getLogger().info(`VSP ID extracted: ${vspId}`)
  Logger.getLogger().info(`VSP ID type: ${typeof vspId}`)
  Logger.getLogger().info(`Format: ${isJson ? 'JSON' : 'XML'}`)

  const cache = await Cache.getInstance()
  const cacheKey = `user:${userId}:job:${job.id}`

  // Validate vspId
  if (!vspId) {
    const error = 'VSP ID is missing from job data'
    Logger.getLogger().error(error)
    await cache.hset(cacheKey, 'status', JOB_STATUS.FAILED, 'error', error)
    return done(null, { error })
  }

  try {
    // Update progress
    job.progress({ step: 'Reading VSP Library', current: 1, total: 4 })

    // Read the VSP Library
    const vsp = await FhirClient.getInstance().read({
      resourceType: 'Library',
      id: vspId
    }) as fhir4.Library

    Logger.getLogger().info(`VSP Library read: ${vsp.id}`)

    // Update progress
    job.progress({ step: 'Retrieving VSAC credentials', current: 2, total: 4 })

    // Get VSAC credentials for the user
    const vsCreds = await tsCredentialService.getVsacCredentials(userId)

    if (!vsCreds || !vsCreds.username || !vsCreds.password) {
      const error = 'VSAC credentials not found. Please configure your VSAC API key in Settings.'
      Logger.getLogger().error(error)
      await cache.hset(cacheKey, 'status', JOB_STATUS.FAILED, 'error', error)
      return done(null, { error })
    }

    Logger.getLogger().info(`Retrieved VSAC credentials for user: ${userId}`)

    // Update progress
    job.progress({ step: 'Calling $package operation (may take several minutes)', current: 3, total: 4 })

    // Construct Basic Auth header for VSAC
    // Format: "Authorization: Basic <base64(apikey:api-key-value)>"
    const vsacAuth = Buffer.from(`apikey:${vsCreds.password}`).toString('base64')
    const vsacAuthHeader = `Authorization: Basic ${vsacAuth}`

    Logger.getLogger().info(`VSAC endpoint configured with Basic Auth`)

    // Create Parameters resource following CRMI specification
    // See: https://build.fhir.org/ig/HL7/crmi-ig/OperationDefinition-crmi-package.html
    const parametersInput: fhir4.Parameters = {
      resourceType: 'Parameters',
      parameter: [
        {
          name: 'include',
          valueCode: 'ValueSet'
        },
        {
          name: 'artifactEndpointConfiguration',
          part: [
            {
              name: 'artifactRoute',
              valueUri: 'http://cts.nlm.nih.gov/fhir'
            },
            {
              name: 'endpoint',
              resource: {
                resourceType: 'Endpoint',
                status: 'active',
                connectionType: {
                  system: 'http://terminology.hl7.org/CodeSystem/endpoint-connection-type',
                  code: 'hl7-fhir-rest'
                },
                name: 'VSAC FHIR Terminology Server',
                address: 'https://cts.nlm.nih.gov/fhir',
                header: [vsacAuthHeader]
              }
            }
          ]
        },
        {
          name: 'terminologyEndpoint',
          resource: {
            resourceType: 'Endpoint',
            status: 'active',
            connectionType: {
              system: 'http://hl7.org/fhir/ValueSet/endpoint-connection-type',
              code: 'hl7-fhir-rest'
            },
            payloadType: [
              {
                system: 'http://hl7.org/fhir/ValueSet/endpoint-payload-type',
                code: 'any'
              }
            ],
            address: 'http://tx.fhir.org/r4'
          }
        }
      ]
    }

    // Call $package operation on the specific VSP instance
    const { fetch: f, Agent } = require('undici')
    const baseUrl = FhirClient.getInstance().baseUrl
    const url = `${baseUrl}/Library/${vspId}/$package`

    // Use the appropriate Accept header based on desired format
    const acceptHeader = isJson ? 'application/fhir+json' : 'application/fhir+xml'
    Logger.getLogger().info(`Calling $package at: ${url} (format: ${isJson ? 'JSON' : 'XML'})`)
    Logger.getLogger().info(`VSP ID: ${vspId}`)
    Logger.getLogger().info(`VSAC Endpoint: https://cts.nlm.nih.gov/fhir`)

    const response = await f(url, {
      method: 'POST',
      body: JSON.stringify(parametersInput),
      dispatcher: new Agent({
        connectTimeout: 10 * 60 * 1000,  // 10 minutes
        headersTimeout: 10 * 60 * 1000,
        keepAliveTimeout: 10 * 60 * 1000,
        keepAliveMaxTimeout: 10 * 60 * 1000
      }),
      headers: {
        'Content-Type': 'application/fhir+json',
        'Accept': acceptHeader,  // Request the format we want directly from FHIR server
        ...FhirClient.getInstance().customHeaders
      }
    })

    Logger.getLogger().info(`$package response status: ${response.status}`)

    if (!response.ok) {
      let errorText = 'Unknown error'
      try {
        errorText = await response.text()
      } catch (e) {
        Logger.getLogger().error('Failed to read error response:', e)
      }
      Logger.getLogger().error(`$package failed: ${errorText}`)
      await cache.hset(cacheKey, 'status', JOB_STATUS.FAILED, 'error', `Package operation failed: ${errorText}`)
      return done(null, { error: errorText })
    }

    // Update progress
    job.progress({ step: 'Processing response', current: 4, total: 4 })

    // Get the response as text (works for both JSON and XML)
    const packageContent = await response.text()

    // Validate the response contains a Bundle (basic check)
    if (!packageContent.includes('Bundle')) {
      const error = '$package did not return a Bundle'
      Logger.getLogger().error(error)
      await cache.hset(cacheKey, 'status', JOB_STATUS.FAILED, 'error', error)
      return done(null, { error })
    }

    Logger.getLogger().info(`Package response received (${packageContent.length} bytes)`)

    // Store job as completed
    await cache.hset(cacheKey, 'status', JOB_STATUS.COMPLETED)

    Logger.getLogger().info('VSP Package job completed successfully')
    Logger.getLogger().info('='.repeat(80))

    // Return in the same structure as Programs for compatibility with ExportNotification
    // ExportNotification expects job.returnvalue.response to contain the package content
    return done(null, {
      response: packageContent,
      bundleSize: packageContent.length
    })

  } catch (error: any) {
    const errorMsg = error.message || 'Failed to package VSP'
    Logger.getLogger().error('='.repeat(80))
    Logger.getLogger().error('FATAL ERROR in VSP package job')
    Logger.getLogger().error(`Job ID: ${job.id}`)
    Logger.getLogger().error(`Error: ${errorMsg}`)
    Logger.getLogger().error(`Stack: ${error.stack}`)
    Logger.getLogger().error('='.repeat(80))

    await cache.hset(cacheKey, 'status', JOB_STATUS.FAILED, 'error', errorMsg)
    return done(null, { error: errorMsg })
  }
})

export default VSPPackageQueue
