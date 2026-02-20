import Cache from '@/cache'
import { DEFAULT_JOB_CONFIG, JOB_EXPIRATION, QUEUE_REDIS_URL } from '@/config'
import { JOB_STATUS, JOB_TYPE } from '@/constants'
import Queue from 'bull'
import Logger from '@/helpers/server/logger'
import FhirClient from '@/backend/clients/FhirCdrClient'
import { addTerminologyEndpointToParameters } from '@/helpers/fhirResourceHelper'

const VSPDiffQueue = new Queue('vspDiff', QUEUE_REDIS_URL)

const originalAdd = VSPDiffQueue.add

// Overriding the add method
VSPDiffQueue.add = async function (...args) {
  const data = args[0]
  const userId = data.userId

  const job = await originalAdd.apply(this, [data, DEFAULT_JOB_CONFIG])
  const cache = await Cache.getInstance()
  const cacheKey = `user:${userId}:job:${job.id}`

  await cache.hset(cacheKey, {
    jobId: job.id,
    status: JOB_STATUS.IN_PROGRESS,
    type: JOB_TYPE.CHANGE_LOG,
    metadata: JSON.stringify(data?.metadata)
  })
  await cache.sadd(`user:${userId}:jobs`, job.id) // Adds job to user's job list
  await cache.expire(cacheKey, JOB_EXPIRATION) // Defaults to expires job in 24 hours
  return job
}

/**
 * Worker to call $artifact-diff operation on VSP Libraries
 * Uses the CRMI $artifact-diff operation which returns FHIR patch format
 * See: https://build.fhir.org/ig/HL7/crmi-ig/OperationDefinition-crmi-artifact-diff.html
 * See: https://www.hl7.org/fhir/fhirpatch.html
 */
VSPDiffQueue.process(async function (job: any, done) {
  Logger.getLogger().info('='.repeat(80))
  Logger.getLogger().info('Begin VSP Artifact Diff Job')
  Logger.getLogger().info(`Job ID: ${job.id}`)

  const { baseVSPId, targetVSPId, userId } = job.data
  Logger.getLogger().info(`Base VSP ID: ${baseVSPId}`)
  Logger.getLogger().info(`Target VSP ID: ${targetVSPId}`)

  const cache = await Cache.getInstance()
  const cacheKey = `user:${userId}:job:${job.id}`

  try {
    Logger.getLogger().info(`Using Library/${baseVSPId} as source`)
    Logger.getLogger().info(`Using Library/${targetVSPId} as target`)

    // Build Parameters input for $artifact-diff using resource IDs
    const parameters: fhir4.Parameters = {
      resourceType: 'Parameters',
      parameter: [
        {
          name: 'source',
          valueString: `Library/${baseVSPId}`
        },
        {
          name: 'target',
          valueString: `Library/${targetVSPId}`
        },
        {
          name: 'compareComputable',
          valueBoolean: true
        },
        {
          name: 'compareExecutable',
          valueBoolean: true
        }
      ]
    }

    // Add terminology endpoint for expansion
    const input = await addTerminologyEndpointToParameters({ parameters, userId })

    Logger.getLogger().info('Calling $artifact-diff operation')
    Logger.getLogger().info(`Request body: ${JSON.stringify(input, null, 2)}`)

    // Call $artifact-diff operation at type level
    const { fetch: f, Agent } = require('undici')
    const baseUrl = FhirClient.getInstance().baseUrl
    const url = `${baseUrl}/Library/$artifact-diff`

    const response = await f(url, {
      method: 'POST',
      body: JSON.stringify(input),
      dispatcher: new Agent({
        connectTimeout: 10 * 60 * 1000,  // 10 minutes
        headersTimeout: 10 * 60 * 1000,
        keepAliveTimeout: 10 * 60 * 1000,
        keepAliveMaxTimeout: 10 * 60 * 1000
      }),
      headers: {
        'Content-Type': 'application/fhir+json',
        'Accept': 'application/fhir+json',
        ...FhirClient.getInstance().customHeaders
      }
    })

    Logger.getLogger().info(`$artifact-diff response status: ${response.status}`)

    if (!response.ok) {
      let errorText = 'Unknown error'
      try {
        errorText = await response.text()
        Logger.getLogger().error(`$artifact-diff failed: ${errorText}`)
      } catch (e: any) {
        Logger.getLogger().error(`Failed to read error response: ${e.message || e}`)
      }
      await cache.hset(cacheKey, 'status', JOB_STATUS.FAILED, 'error', `Artifact diff operation failed: ${errorText}`)
      return done(null, { error: errorText })
    }

    // Parse the response
    const diffResult = await response.json() as fhir4.Parameters

    Logger.getLogger().info(`$artifact-diff response resourceType: ${diffResult.resourceType}`)

    // Validate response is a Parameters resource
    if (diffResult.resourceType !== 'Parameters') {
      const error = `Expected Parameters resource, got ${diffResult.resourceType}`
      Logger.getLogger().error(error)
      await cache.hset(cacheKey, 'status', JOB_STATUS.FAILED, 'error', error)
      return done(null, { error })
    }

    // Store as completed
    await cache.hset(cacheKey, 'status', JOB_STATUS.COMPLETED)

    Logger.getLogger().info('VSP Artifact Diff job completed successfully')
    Logger.getLogger().info('='.repeat(80))

    // Return the Parameters resource with FHIR patch format
    return done(null, diffResult)

  } catch (error: any) {
    const errorMsg = error.message || 'Failed to generate artifact diff'
    Logger.getLogger().error('='.repeat(80))
    Logger.getLogger().error('FATAL ERROR in VSP artifact diff job')
    Logger.getLogger().error(`Job ID: ${job.id}`)
    Logger.getLogger().error(`Error: ${errorMsg}`)
    Logger.getLogger().error(`Stack: ${error.stack}`)
    Logger.getLogger().error('='.repeat(80))

    await cache.hset(cacheKey, 'status', JOB_STATUS.FAILED, 'error', errorMsg)
    return done(null, { error: errorMsg })
  }
})

export default VSPDiffQueue
