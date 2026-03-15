import { QUEUE_REDIS_URL } from '@/config'
import Cache from '@/cache'
import { JOB_STATUS, VSP_PACKAGE_CACHE_IDENTIFIER_SYSTEM, VSP_PACKAGE_CACHE_TAG } from '@/constants'
import FhirClient from '@/backend/clients/FhirCdrClient'
import Logger from '@/helpers/server/logger'
import Queue from 'bull'
import { tsCredentialService } from '@/backend/services/TsCredentialService'

const VSPPackageQueue = new Queue('vspPackage', QUEUE_REDIS_URL)

/**
 * Search for a cached $package Bundle by VSP identifier.
 * Returns the cached Bundle's ID or null if not found.
 */
async function searchCachedPackage(vspId: string, vspVersion: string): Promise<string | null> {
  try {
    const { fetch: f } = require('undici')
    const baseUrl = FhirClient.getInstance().baseUrl
    const identifierParam = `${VSP_PACKAGE_CACHE_IDENTIFIER_SYSTEM}|${vspId}|${vspVersion}`
    const url = `${baseUrl}/Bundle?identifier=${encodeURIComponent(identifierParam)}&_summary=true&_count=1`

    const response = await f(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/fhir+json',
        ...FhirClient.getInstance().customHeaders
      }
    })

    if (!response.ok) {
      Logger.getLogger().warn(`Cache search returned status ${response.status}`)
      return null
    }

    const searchBundle = await response.json() as fhir4.Bundle
    const entry = searchBundle.entry?.[0]
    if (entry?.resource?.id) {
      return entry.resource.id
    }
    return null
  } catch (error: any) {
    Logger.getLogger().warn(`Cache search failed: ${error.message || error}`)
    return null
  }
}

/**
 * Retrieve the full cached Bundle content by ID in the desired format.
 */
async function getCachedPackageContent(bundleId: string, isJson: boolean): Promise<string | null> {
  try {
    const { fetch: f } = require('undici')
    const baseUrl = FhirClient.getInstance().baseUrl
    const url = `${baseUrl}/Bundle/${bundleId}`
    const acceptHeader = isJson ? 'application/fhir+json' : 'application/fhir+xml'

    const response = await f(url, {
      method: 'GET',
      headers: {
        'Accept': acceptHeader,
        ...FhirClient.getInstance().customHeaders
      }
    })

    if (!response.ok) {
      Logger.getLogger().warn(`Cache read returned status ${response.status}`)
      return null
    }

    return await response.text()
  } catch (error: any) {
    Logger.getLogger().warn(`Cache read failed: ${error.message || error}`)
    return null
  }
}

/**
 * Strip cache metadata from a cached Bundle to reproduce original $package output.
 */
function stripCacheMetadata(content: string, isJson: boolean): string {
  if (isJson) {
    const bundle = JSON.parse(content)
    delete bundle.id
    delete bundle.identifier
    delete bundle.meta
    return JSON.stringify(bundle)
  } else {
    // Remove <id .../> element
    let result = content.replace(/<id[^>]*\/>\s*/m, '')
    // Remove <identifier>...</identifier> block
    result = result.replace(/<identifier>[\s\S]*?<\/identifier>\s*/m, '')
    // Remove <meta>...</meta> block
    result = result.replace(/<meta>[\s\S]*?<\/meta>\s*/m, '')
    return result
  }
}

/**
 * Store a $package result in the CDR as a cached Bundle.
 * Non-fatal — logs a warning if storage fails (e.g., Bundle too large).
 */
async function storeCachedPackage(packageContent: string, vspId: string, vspVersion: string, isJson: boolean): Promise<void> {
  try {
    const { fetch: f } = require('undici')
    const baseUrl = FhirClient.getInstance().baseUrl
    const url = `${baseUrl}/Bundle`

    const cacheIdentifier = {
      system: VSP_PACKAGE_CACHE_IDENTIFIER_SYSTEM,
      value: `${vspId}|${vspVersion}`
    }

    let body: string
    let contentType: string

    if (isJson) {
      const bundle = JSON.parse(packageContent)
      bundle.identifier = cacheIdentifier
      bundle.meta = {
        ...bundle.meta,
        tag: [...(bundle.meta?.tag || []), VSP_PACKAGE_CACHE_TAG]
      }
      body = JSON.stringify(bundle)
      contentType = 'application/fhir+json'
    } else {
      // Inject <identifier> and <meta> XML elements after the <Bundle ...> opening tag
      const identifierXml = `<identifier><system value="${cacheIdentifier.system}"/><value value="${cacheIdentifier.value}"/></identifier>`
      const metaXml = `<meta><tag><system value="${VSP_PACKAGE_CACHE_TAG.system}"/><code value="${VSP_PACKAGE_CACHE_TAG.code}"/></tag></meta>`

      // Insert after the <Bundle ...> opening tag, before the first child element
      body = packageContent.replace(
        /(<Bundle[^>]*>)/,
        `$1${identifierXml}${metaXml}`
      )
      contentType = 'application/fhir+xml'
    }

    const response = await f(url, {
      method: 'POST',
      body,
      headers: {
        'Content-Type': contentType,
        'Accept': 'application/fhir+json',
        ...FhirClient.getInstance().customHeaders
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      Logger.getLogger().warn(
        `Failed to cache $package result for VSP ${vspId} (${packageContent.length} bytes).\n` +
        `This is non-fatal — subsequent exports will re-run $package.\n` +
        `To enable caching for large packages, increase the FHIR server's\n` +
        `maximum resource size limit.\n` +
        `Error: ${errorText}`
      )
    } else {
      Logger.getLogger().info(`Cached $package result for VSP ${vspId} (${packageContent.length} bytes)`)
    }
  } catch (error: any) {
    Logger.getLogger().warn(
      `Failed to cache $package result for VSP ${vspId} (${packageContent.length} bytes).\n` +
      `This is non-fatal — subsequent exports will re-run $package.\n` +
      `To enable caching for large packages, increase the FHIR server's\n` +
      `maximum resource size limit.\n` +
      `Error: ${error.message || error}`
    )
  }
}

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
  Logger.getLogger().info(`Raw job.data: ${JSON.stringify(job.data)}`)

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
    // Determine total steps based on whether caching is applicable
    // Active VSPs are immutable and can use caching (5 steps); others skip cache (4 steps)

    // Step 1: Read VSP Library
    job.progress({ step: 'Reading VSP Library', current: 1, total: 5 })

    const vsp = await FhirClient.getInstance().read({
      resourceType: 'Library',
      id: vspId
    }) as fhir4.Library

    Logger.getLogger().info(`VSP Library read: ${vsp.id} (status: ${vsp.status})`)

    const isActive = vsp.status === 'active'
    const vspVersion = vsp.version || ''
    const totalSteps = isActive ? 5 : 4

    // Step 2 (active only): Check CDR cache
    if (isActive) {
      job.progress({ step: 'Checking cache', current: 2, total: totalSteps })

      const cachedBundleId = await searchCachedPackage(vspId, vspVersion)
      if (cachedBundleId) {
        Logger.getLogger().info(`Cache HIT for VSP ${vspId}|${vspVersion} (Bundle/${cachedBundleId})`)

        const cachedContent = await getCachedPackageContent(cachedBundleId, isJson)
        if (cachedContent) {
          const cleanedContent = stripCacheMetadata(cachedContent, isJson)

          await cache.hset(cacheKey, 'status', JOB_STATUS.COMPLETED)
          Logger.getLogger().info(`Returning cached package (${cleanedContent.length} bytes)`)
          Logger.getLogger().info('='.repeat(80))

          return done(null, {
            response: cleanedContent,
            bundleSize: cleanedContent.length
          })
        }
        Logger.getLogger().warn(`Cache HIT but failed to read content — falling back to $package`)
      } else {
        Logger.getLogger().info(`Cache MISS for VSP ${vspId}|${vspVersion}`)
      }
    }

    // Step 3 (or 2 for non-active): Retrieve VSAC credentials
    const credStep = isActive ? 3 : 2
    job.progress({ step: 'Retrieving VSAC credentials', current: credStep, total: totalSteps })

    const vsCreds = await tsCredentialService.getVsacCredentials(userId)

    if (!vsCreds || !vsCreds.username || !vsCreds.password) {
      const error = 'VSAC credentials not found. Please configure your VSAC API key in Settings.'
      Logger.getLogger().error(error)
      await cache.hset(cacheKey, 'status', JOB_STATUS.FAILED, 'error', error)
      return done(null, { error })
    }

    Logger.getLogger().info(`Retrieved VSAC credentials for user: ${userId}`)

    // Step 4 (or 3 for non-active): Call $package
    const packageStep = isActive ? 4 : 3
    job.progress({ step: 'Calling $package operation (may take several minutes)', current: packageStep, total: totalSteps })

    // Construct Basic Auth header for VSAC
    const vsacAuth = Buffer.from(`apikey:${vsCreds.password}`).toString('base64')
    const vsacAuthHeader = `Authorization: Basic ${vsacAuth}`

    Logger.getLogger().info(`VSAC endpoint configured with Basic Auth`)

    // Create Parameters resource following CRMI specification
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
                header: [vsacAuthHeader],
                payloadType: [{ coding: [{ code: 'none' }] }]
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
                coding: [
                  {
                    system: 'http://hl7.org/fhir/ValueSet/endpoint-payload-type',
                    code: 'any'
                  }
                ]
              }
            ],
            address: 'http://tx.fhir.org/r4'
          }
        }
      ]
    }

    const { fetch: f, Agent } = require('undici')
    const baseUrl = FhirClient.getInstance().baseUrl
    const url = `${baseUrl}/Library/${vspId}/$package`

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
        'Accept': acceptHeader,
        ...FhirClient.getInstance().customHeaders
      }
    })

    Logger.getLogger().info(`$package response status: ${response.status}`)

    if (!response.ok) {
      let errorText = 'Unknown error'
      try {
        errorText = await response.text()
      } catch (e: any) {
        Logger.getLogger().error(`Failed to read error response: ${e.message || e}`)
      }
      Logger.getLogger().error(`$package failed: ${errorText}`)
      await cache.hset(cacheKey, 'status', JOB_STATUS.FAILED, 'error', `Package operation failed: ${errorText}`)
      return done(null, { error: errorText })
    }

    // Step 5 (or 4 for non-active): Process response
    const processStep = isActive ? 5 : 4
    job.progress({ step: 'Processing response', current: processStep, total: totalSteps })

    const packageContent = await response.text()

    if (!packageContent.includes('Bundle')) {
      const error = '$package did not return a Bundle'
      Logger.getLogger().error(error)
      await cache.hset(cacheKey, 'status', JOB_STATUS.FAILED, 'error', error)
      return done(null, { error })
    }

    Logger.getLogger().info(`Package response received (${packageContent.length} bytes)`)

    // Cache the result for active VSPs (non-fatal)
    if (isActive) {
      await storeCachedPackage(packageContent, vspId, vspVersion, isJson)
    }

    await cache.hset(cacheKey, 'status', JOB_STATUS.COMPLETED)

    Logger.getLogger().info('VSP Package job completed successfully')
    Logger.getLogger().info('='.repeat(80))

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

export { stripCacheMetadata }
export default VSPPackageQueue
