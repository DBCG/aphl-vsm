import { PACKAGE_CACHE_IDENTIFIER_SYSTEM, PACKAGE_CACHE_TAG } from '@/constants'
import FhirClient from '@/backend/clients/FhirCdrClient'
import Logger from '@/helpers/server/logger'
import { createHash } from 'crypto'

/**
 * Produce a short hash of the $package parameters that affect output content.
 * If the terminology routes or endpoints change, the hash changes and the
 * previous cache entry becomes a miss.
 */
export function hashPackageParams(artifactRoute: string, artifactEndpointAddress: string, terminologyEndpointAddress: string): string {
  const input = [artifactRoute, artifactEndpointAddress, terminologyEndpointAddress].join('|')
  return createHash('sha256').update(input).digest('hex').slice(0, 12)
}

/**
 * Search for a cached $package Bundle by resource identifier.
 * Returns the cached Bundle's ID or null if not found.
 */
export async function searchCachedPackage(resourceId: string, resourceVersion: string, paramsHash: string): Promise<string | null> {
  try {
    const { fetch: f } = require('undici')
    const baseUrl = FhirClient.getInstance().baseUrl
    const identifierParam = `${PACKAGE_CACHE_IDENTIFIER_SYSTEM}|${resourceId}|${resourceVersion}|${paramsHash}`
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
export async function getCachedPackageContent(bundleId: string, isJson: boolean): Promise<string | null> {
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
export function stripCacheMetadata(content: string, isJson: boolean): string {
  if (isJson) {
    const bundle = JSON.parse(content)
    delete bundle.id
    delete bundle.identifier
    delete bundle.meta
    // Restore original Bundle type
    bundle.type = 'transaction'
    return JSON.stringify(bundle)
  } else {
    // Remove <id .../> element
    let result = content.replace(/<id[^>]*\/>\s*/m, '')
    // Remove <identifier>...</identifier> block
    result = result.replace(/<identifier>[\s\S]*?<\/identifier>\s*/m, '')
    // Remove <meta>...</meta> block
    result = result.replace(/<meta>[\s\S]*?<\/meta>\s*/m, '')
    // Restore original Bundle type
    result = result.replace(/<type value="collection"\s*\/>/, '<type value="transaction"/>')
    return result
  }
}

/**
 * Store a $package result in the CDR as a cached Bundle.
 * Non-fatal — logs a warning if storage fails (e.g., Bundle too large).
 */
export async function storeCachedPackage(packageContent: string, resourceId: string, resourceVersion: string, paramsHash: string, isJson: boolean): Promise<void> {
  try {
    const { fetch: f } = require('undici')
    const baseUrl = FhirClient.getInstance().baseUrl
    const url = `${baseUrl}/Bundle`

    const cacheIdentifier = {
      system: PACKAGE_CACHE_IDENTIFIER_SYSTEM,
      value: `${resourceId}|${resourceVersion}|${paramsHash}`
    }

    let body: string
    let contentType: string

    if (isJson) {
      const bundle = JSON.parse(packageContent)
      bundle.identifier = cacheIdentifier
      bundle.meta = {
        ...bundle.meta,
        tag: [...(bundle.meta?.tag || []), PACKAGE_CACHE_TAG]
      }
      // FHIR servers reject storing transaction Bundles as resources — use collection for storage
      bundle.type = 'collection'
      body = JSON.stringify(bundle)
      contentType = 'application/fhir+json'
    } else {
      // Inject <identifier> and <meta> XML elements after the <Bundle ...> opening tag
      const identifierXml = `<identifier><system value="${cacheIdentifier.system}"/><value value="${cacheIdentifier.value}"/></identifier>`
      const metaXml = `<meta><tag><system value="${PACKAGE_CACHE_TAG.system}"/><code value="${PACKAGE_CACHE_TAG.code}"/></tag></meta>`

      // Insert after the <Bundle ...> opening tag, before the first child element
      body = packageContent.replace(
        /(<Bundle[^>]*>)/,
        `$1${identifierXml}${metaXml}`
      )
      // FHIR servers reject storing transaction Bundles — swap to collection
      body = body.replace(/<type value="transaction"\s*\/>/, '<type value="collection"/>')
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
        `Failed to cache $package result for ${resourceId} (${packageContent.length} bytes).\n` +
        `This is non-fatal — subsequent exports will re-run $package.\n` +
        `To enable caching for large packages, increase the FHIR server's\n` +
        `maximum resource size limit.\n` +
        `Error: ${errorText}`
      )
    } else {
      Logger.getLogger().info(`Cached $package result for ${resourceId} (${packageContent.length} bytes)`)
    }
  } catch (error: any) {
    Logger.getLogger().warn(
      `Failed to cache $package result for ${resourceId} (${packageContent.length} bytes).\n` +
      `This is non-fatal — subsequent exports will re-run $package.\n` +
      `To enable caching for large packages, increase the FHIR server's\n` +
      `maximum resource size limit.\n` +
      `Error: ${error.message || error}`
    )
  }
}
