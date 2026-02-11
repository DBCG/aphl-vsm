import { QUEUE_REDIS_URL, DEFAULT_JOB_CONFIG, JOB_EXPIRATION } from '@/config'
import Cache from '@/cache'
import { JOB_STATUS, JOB_TYPE } from '@/constants'
import FhirClient from '@/backend/clients/FhirCdrClient'
import Logger from '@/helpers/server/logger'
import Queue from 'bull'
import { ExtendedManifestData } from '@/types/vspTypes'

const DependencyQueue = new Queue('fetchDependencies', QUEUE_REDIS_URL)

const originalAdd = DependencyQueue.add

// Override add method to set cache entries
DependencyQueue.add = async function (...args) {
  const data = args[0]
  const userId = data.userId

  const job = await originalAdd.apply(this, [data, args[1] || DEFAULT_JOB_CONFIG])
  const cache = await Cache.getInstance()
  const cacheKey = `user:${userId}:job:${job.id}`

  await cache.hset(cacheKey, {
    jobId: job.id,
    status: JOB_STATUS.IN_PROGRESS,
    type: JOB_TYPE.FETCH_DEPENDENCIES,
    metadata: JSON.stringify(data?.metadata || { igCanonical: data.igCanonical, igPackageId: data.igPackageId })
  })
  await cache.sadd(`user:${userId}:jobs`, job.id)
  await cache.expire(cacheKey, JOB_EXPIRATION)

  return job
}

/**
 * Download and extract ImplementationGuide from FHIR package
 */
async function downloadAndExtractIG(igPackageId: string, igVersion: string): Promise<fhir4.ImplementationGuide | null> {
  try {
    Logger.getLogger().info(`Downloading package: ${igPackageId}@${igVersion}`)

    // Download tarball from packages.simplifier.net
    const tarballUrl = `https://packages.simplifier.net/${igPackageId}/${igVersion}`
    const response = await fetch(tarballUrl)

    if (!response.ok) {
      Logger.getLogger().warn(`Package registry returned ${response.status} for ${tarballUrl}`)
      return null
    }

    // Get tarball as buffer
    const tarballBuffer = Buffer.from(await response.arrayBuffer())

    // Extract ImplementationGuide resource using tar library
    const tar = require('tar-stream')
    const zlib = require('zlib')

    return new Promise((resolve) => {
      const extract = tar.extract()
      let implementationGuide: fhir4.ImplementationGuide | null = null

      extract.on('entry', (header: any, stream: any, next: any) => {
        // Look for ImplementationGuide*.json files in package/ directory
        if (header.name.startsWith('package/ImplementationGuide') && header.name.endsWith('.json')) {
          Logger.getLogger().info(`Found IG file: ${header.name}`)
          let data = ''
          stream.on('data', (chunk: Buffer) => {
            data += chunk.toString()
          })
          stream.on('end', () => {
            try {
              const resource = JSON.parse(data)
              if (resource.resourceType === 'ImplementationGuide') {
                implementationGuide = resource
                Logger.getLogger().info(`Extracted ImplementationGuide: ${resource.id}`)
              }
            } catch (e) {
              Logger.getLogger().error('Failed to parse ImplementationGuide:', e)
            }
            next()
          })
        } else {
          stream.on('end', next)
          stream.resume() // Skip this entry
        }
      })

      extract.on('finish', () => {
        if (!implementationGuide) {
          Logger.getLogger().warn('ImplementationGuide not found in package')
        }
        resolve(implementationGuide)
      })

      extract.on('error', (err: Error) => {
        Logger.getLogger().error('Error extracting tarball:', err)
        resolve(null)
      })

      // Pipe gunzipped tarball to extractor
      const gunzip = zlib.createGunzip()
      gunzip.on('error', (err: Error) => {
        Logger.getLogger().error('Error decompressing tarball:', err)
        resolve(null)
      })

      gunzip.pipe(extract)
      gunzip.end(tarballBuffer)
    })
  } catch (error: any) {
    Logger.getLogger().error('Error downloading package:', error)
    return null
  }
}

/**
 * Call $data-requirements operation on ImplementationGuide
 * Uses undici fetch with extended timeouts for long-running operations
 */
async function callDataRequirements(ig: fhir4.ImplementationGuide): Promise<fhir4.Library | null> {
  let response: any = null
  try {
    Logger.getLogger().info(`Calling $data-requirements on IG: ${ig.id}`)
    Logger.getLogger().info(`IG URL: ${ig.url}, Version: ${ig.version}`)

    // Use undici fetch with long timeouts for this operation
    const { fetch: f, Agent } = require('undici')
    const baseUrl = FhirClient.getInstance().baseUrl
    const url = `${baseUrl}/ImplementationGuide/$data-requirements`

    // Wrap IG in Parameters resource
    const parametersInput: fhir4.Parameters = {
      resourceType: 'Parameters',
      parameter: [
        {
          name: 'implementationGuide',
          resource: ig
        }
      ]
    }

    Logger.getLogger().info(`Making POST request to: ${url}`)
    Logger.getLogger().info(`Request body size: ${JSON.stringify(parametersInput).length} bytes`)

    response = await f(url, {
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
        'Accept': 'application/fhir+json',
        ...FhirClient.getInstance().customHeaders
      }
    })

    Logger.getLogger().info(`$data-requirements response received`)
    Logger.getLogger().info(`Response status: ${response.status}`)
    Logger.getLogger().info(`Response statusText: ${response.statusText}`)

    if (!response.ok) {
      let errorText = 'Unknown error'
      try {
        errorText = await response.text()
      } catch (e) {
        Logger.getLogger().error('Failed to read error response body:', e)
      }
      Logger.getLogger().error(`$data-requirements failed with status ${response.status}`)
      Logger.getLogger().error(`Error response: ${errorText}`)
      return null
    }

    Logger.getLogger().info('Parsing JSON response...')
    const result = await response.json()
    Logger.getLogger().info(`$data-requirements response parsed, type: ${result?.resourceType}`)

    if (!result || result.resourceType !== 'Library') {
      Logger.getLogger().warn('$data-requirements did not return a Library resource')
      Logger.getLogger().warn(`Response resourceType: ${result?.resourceType}`)
      return null
    }

    Logger.getLogger().info(`$data-requirements returned Library: ${result.id}`)
    return result as fhir4.Library
  } catch (error: any) {
    Logger.getLogger().error('='.repeat(80))
    Logger.getLogger().error('EXCEPTION in callDataRequirements')
    Logger.getLogger().error(`Error type: ${typeof error}`)
    Logger.getLogger().error(`Error constructor: ${error?.constructor?.name}`)
    Logger.getLogger().error(`Error message: ${error?.message || 'No message'}`)
    Logger.getLogger().error(`Error code: ${error?.code || 'No code'}`)
    Logger.getLogger().error(`Error name: ${error?.name || 'No name'}`)

    if (error?.cause) {
      Logger.getLogger().error(`Error cause: ${JSON.stringify(error.cause)}`)
    }

    if (response) {
      Logger.getLogger().error(`Response was defined: status=${response.status}`)
    } else {
      Logger.getLogger().error('Response was null/undefined - request never completed')
    }

    try {
      Logger.getLogger().error(`Error stack: ${error?.stack || 'No stack trace'}`)
      Logger.getLogger().error(`Full error object: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`)
    } catch (e) {
      Logger.getLogger().error('Could not stringify error object')
    }

    Logger.getLogger().error('='.repeat(80))
    return null
  }
}

/**
 * Call $infer-manifest-parameters operation on module-definition Library
 * Uses undici fetch with extended timeouts for long-running operations
 */
async function callInferManifestParameters(moduleDefinition: fhir4.Library): Promise<ExtendedManifestData | null> {
  let response: any = null
  try {
    Logger.getLogger().info(`Calling $infer-manifest-parameters on Library: ${moduleDefinition.id}`)

    // Wrap the module-definition Library in a Parameters resource
    const parametersInput: fhir4.Parameters = {
      resourceType: 'Parameters',
      parameter: [
        {
          name: 'library',
          resource: moduleDefinition
        }
      ]
    }

    Logger.getLogger().info(`Request body size: ${JSON.stringify(parametersInput).length} bytes`)

    // Use undici fetch with long timeouts for this operation
    const { fetch: f, Agent } = require('undici')
    const baseUrl = FhirClient.getInstance().baseUrl
    const url = `${baseUrl}/Library/$infer-manifest-parameters`

    Logger.getLogger().info(`Making POST request to: ${url}`)

    response = await f(url, {
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
        'Accept': 'application/fhir+json',
        ...FhirClient.getInstance().customHeaders
      }
    })

    Logger.getLogger().info(`$infer-manifest-parameters response received`)
    Logger.getLogger().info(`Response status: ${response.status}`)
    Logger.getLogger().info(`Response statusText: ${response.statusText}`)

    if (!response.ok) {
      let errorText = 'Unknown error'
      try {
        errorText = await response.text()
      } catch (e) {
        Logger.getLogger().error('Failed to read error response body:', e)
      }
      Logger.getLogger().error(`$infer-manifest-parameters failed with status ${response.status}`)
      Logger.getLogger().error(`Error response: ${errorText}`)
      return null
    }

    Logger.getLogger().info('Parsing JSON response...')
    const result = await response.json()
    Logger.getLogger().info(`$infer-manifest-parameters response parsed, type: ${result?.resourceType}`)

    if (!result || result.resourceType !== 'Library') {
      Logger.getLogger().warn('$infer-manifest-parameters did not return a Library resource')
      Logger.getLogger().warn(`Response resourceType: ${result?.resourceType}`)
      return null
    }

    Logger.getLogger().info('$infer-manifest-parameters returned CRMI manifest Library')

    // Extract the Parameters resource from the contained array
    const manifestLibrary = result as fhir4.Library
    const params = manifestLibrary.contained?.find(
      (r) => r.resourceType === 'Parameters' && r.id === 'expansion-parameters'
    ) as fhir4.Parameters | undefined

    if (!params) {
      Logger.getLogger().warn('No Parameters resource found in manifest Library contained array')
      return null
    }

    Logger.getLogger().info('Found expansion-parameters in contained array')

    // Parse Parameters into ExtendedManifestData
    const codeSystems: Record<string, string[]> = {}
    const valueSets: Record<string, string[]> = {}

    params.parameter?.forEach((param) => {
      // CodeSystem versions use system-version parameter with valueString (system|version)
      if (param.name === 'system-version' && param.valueString) {
        const [system, version] = param.valueString.split('|')
        if (system && version) {
          if (!codeSystems[system]) {
            codeSystems[system] = []
          }
          if (!codeSystems[system].includes(version)) {
            codeSystems[system].push(version)
          }
        }
      }
      // ValueSet versions use canonicalVersion parameter with valueCanonical (canonical|version)
      else if (param.name === 'canonicalVersion' && param.valueCanonical) {
        const [canonical, version] = param.valueCanonical.split('|')
        if (canonical && version) {
          if (!valueSets[canonical]) {
            valueSets[canonical] = []
          }
          if (!valueSets[canonical].includes(version)) {
            valueSets[canonical].push(version)
          }
        }
      }
    })

    Logger.getLogger().info(`Parsed ${Object.keys(codeSystems).length} CodeSystems, ${Object.keys(valueSets).length} ValueSets`)

    // Extract relatedArtifact from the manifest Library
    // These are the references to ValueSets/CodeSystems needed for $package
    const relatedArtifact = manifestLibrary.relatedArtifact || []
    Logger.getLogger().info(`Found ${relatedArtifact.length} relatedArtifacts in manifest Library`)

    return {
      codeSystems,
      valueSets,
      relatedArtifact
    }
  } catch (error: any) {
    Logger.getLogger().error('='.repeat(80))
    Logger.getLogger().error('EXCEPTION in callInferManifestParameters')
    Logger.getLogger().error(`Error type: ${typeof error}`)
    Logger.getLogger().error(`Error constructor: ${error?.constructor?.name}`)
    Logger.getLogger().error(`Error message: ${error?.message || 'No message'}`)
    Logger.getLogger().error(`Error code: ${error?.code || 'No code'}`)
    Logger.getLogger().error(`Error name: ${error?.name || 'No name'}`)

    if (error?.cause) {
      Logger.getLogger().error(`Error cause: ${JSON.stringify(error.cause)}`)
    }

    if (response) {
      Logger.getLogger().error(`Response was defined: status=${response.status}`)
    } else {
      Logger.getLogger().error('Response was null/undefined - request never completed')
    }

    try {
      Logger.getLogger().error(`Error stack: ${error?.stack || 'No stack trace'}`)
      Logger.getLogger().error(`Full error object: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`)
    } catch (e) {
      Logger.getLogger().error('Could not stringify error object')
    }

    Logger.getLogger().error('='.repeat(80))
    return null
  }
}

interface DependencyJobData {
  igCanonical: string
  igPackageId: string
  userId: string
}

interface DependencyJobResult {
  manifestData: ExtendedManifestData
  igName: string
  igTitle: string
  source: 'fhir-operations' | 'none'
  warnings: string[]
}

DependencyQueue.process(async function (job: any, done) {
  Logger.getLogger().info('='.repeat(80))
  Logger.getLogger().info('Begin Dependency Fetch Job')
  Logger.getLogger().info(`Job ID: ${job.id}`)
  const { igCanonical, igPackageId, userId } = job.data as DependencyJobData
  Logger.getLogger().info(`IG Canonical: ${igCanonical}`)
  Logger.getLogger().info(`IG Package ID: ${igPackageId}`)
  Logger.getLogger().info(`User ID: ${userId}`)
  const cache = await Cache.getInstance()
  const cacheKey = `user:${userId}:job:${job.id}`

  try {
    // Parse canonical to get version
    const [igUrl, igVersion] = igCanonical.split('|')
    Logger.getLogger().info(`Parsed IG URL: ${igUrl}, Version: ${igVersion}`)

    if (!igVersion) {
      const errorMsg = 'IG canonical must include version (e.g., |6.1.0)'
      Logger.getLogger().error(errorMsg)
      await cache.hset(cacheKey, 'status', JOB_STATUS.FAILED, 'error', errorMsg)
      return done(null, { error: errorMsg })
    }

    const warnings: string[] = []

    // Step 1: Download and extract ImplementationGuide from package
    Logger.getLogger().info('Step 1: Downloading and extracting ImplementationGuide')
    const progress1 = {
      step: 'Downloading and extracting ImplementationGuide',
      current: 1,
      total: 3
    }
    job.progress(progress1)
    Logger.getLogger().info(`Progress updated: ${JSON.stringify(progress1)}`)
    const ig = await downloadAndExtractIG(igPackageId, igVersion)

    if (!ig) {
      const result: DependencyJobResult = {
        manifestData: { codeSystems: {}, valueSets: {} },
        igName: '',
        igTitle: '',
        source: 'none',
        warnings: ['Could not download or extract ImplementationGuide from package. Please add dependencies manually.']
      }
      await cache.hset(cacheKey, 'status', JOB_STATUS.COMPLETED, 'result', JSON.stringify(result))
      return done(null, result)
    }

    // Extract IG name and title for auto-population
    const igName = ig.name || ''
    const igTitle = ig.title || ''

    // Step 2: Call $data-requirements on the IG
    Logger.getLogger().info('Step 2: Calling $data-requirements')
    const progress2 = {
      step: 'Calling $data-requirements operation (this may take several minutes)',
      current: 2,
      total: 3
    }
    job.progress(progress2)
    Logger.getLogger().info(`Progress updated: ${JSON.stringify(progress2)}`)
    const moduleDefinition = await callDataRequirements(ig)

    if (!moduleDefinition) {
      const result: DependencyJobResult = {
        manifestData: { codeSystems: {}, valueSets: {} },
        igName,
        igTitle,
        source: 'none',
        warnings: ['$data-requirements operation failed. Please add dependencies manually.']
      }
      await cache.hset(cacheKey, 'status', JOB_STATUS.COMPLETED, 'result', JSON.stringify(result))
      return done(null, result)
    }

    // Step 3: Call $infer-manifest-parameters on the module-definition
    Logger.getLogger().info('Step 3: Calling $infer-manifest-parameters')
    const progress3 = {
      step: 'Calling $infer-manifest-parameters operation',
      current: 3,
      total: 3
    }
    job.progress(progress3)
    Logger.getLogger().info(`Progress updated: ${JSON.stringify(progress3)}`)
    const manifestData = await callInferManifestParameters(moduleDefinition)

    if (!manifestData) {
      const result: DependencyJobResult = {
        manifestData: { codeSystems: {}, valueSets: {} },
        igName,
        igTitle,
        source: 'none',
        warnings: ['$infer-manifest-parameters operation failed. Please add dependencies manually.']
      }
      await cache.hset(cacheKey, 'status', JOB_STATUS.COMPLETED, 'result', JSON.stringify(result))
      return done(null, result)
    }

    // Success!
    const hasData = Object.keys(manifestData.codeSystems).length > 0 ||
                   Object.keys(manifestData.valueSets).length > 0

    if (!hasData) {
      warnings.push('No dependencies found. The IG may not require any CodeSystem or ValueSet version pinning.')
    } else {
      warnings.push('Dependencies computed from FHIR operations. Please review and adjust as needed.')
    }

    const result: DependencyJobResult = {
      manifestData,
      igName,
      igTitle,
      source: 'fhir-operations',
      warnings
    }

    const progressFinal = {
      step: 'Completed successfully',
      current: 3,
      total: 3
    }
    job.progress(progressFinal)
    Logger.getLogger().info(`Progress updated: ${JSON.stringify(progressFinal)}`)
    await cache.hset(cacheKey, 'status', JOB_STATUS.COMPLETED, 'result', JSON.stringify(result))
    return done(null, result)

  } catch (error: any) {
    const errorMsg = error.message || 'Failed to fetch dependencies'
    Logger.getLogger().error('='.repeat(80))
    Logger.getLogger().error('FATAL ERROR in dependency fetch job')
    Logger.getLogger().error(`Job ID: ${job.id}`)
    Logger.getLogger().error(`Error message: ${errorMsg}`)
    Logger.getLogger().error(`Error code: ${error.code}`)
    Logger.getLogger().error(`Error name: ${error.name}`)
    Logger.getLogger().error(`Error stack: ${error.stack}`)
    Logger.getLogger().error('='.repeat(80))
    await cache.hset(cacheKey, 'status', JOB_STATUS.FAILED, 'error', errorMsg)
    return done(null, { error: errorMsg })
  }
})

export default DependencyQueue
