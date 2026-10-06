import Client from 'fhir-kit-client'

interface AvailableCodeSystem {
  uri: string
  name: string
  latestVersion?: string
}

interface CodeSystemCatalogue {
  codeSystems: AvailableCodeSystem[]
  versionsByUri: Record<string, string[]>
}

const TERMINOLOGY_CAPABILITIES_PATH = 'metadata?mode=terminology'
const CODE_SYSTEM_NAMES_PATH = 'CodeSystem?_count=200&_elements=url,name,title'
const CATALOGUE_TTL_MS = 60 * 60 * 1000

const cache = new Map<string, { expires: number; value: Promise<any> }>()

// Caches the promise so concurrent callers share one round trip, and evicts on
// failure so a transient outage isn't remembered for the whole TTL.
const cached = <T>(key: string, load: () => Promise<T>): Promise<T> => {
  const hit = cache.get(key)
  if (hit && hit.expires > Date.now()) {
    return hit.value as Promise<T>
  }

  const value = load().catch((e) => {
    cache.delete(key)
    throw e
  })
  cache.set(key, { expires: Date.now() + CATALOGUE_TTL_MS, value })
  return value
}

/**
 * The CodeSystems a terminology server holds, with every version it offers for
 * each. Read from `/metadata?mode=terminology`.
 *
 * TerminologyCapabilities has no CodeSystem display name, so names come from a
 * companion CodeSystem search and fall back to the uri.
 *
 * Cached for an hour, keyed by base URL because `TerminologyFhirClient` is a
 * shared mutable singleton that can be repointed at other servers.
 */
const getCodeSystemCatalogue = (client: Client): Promise<CodeSystemCatalogue> =>
  cached(client.baseUrl, () => buildCodeSystemCatalogue(client))

const buildCodeSystemCatalogue = async (client: Client): Promise<CodeSystemCatalogue> => {
  const [terminologyCapabilities, namesByUri] = await Promise.all([
    client.request(TERMINOLOGY_CAPABILITIES_PATH) as Promise<fhir4.TerminologyCapabilities>,
    getNames(client)
  ])

  const codeSystems: AvailableCodeSystem[] = []
  const versionsByUri: Record<string, string[]> = {}

  for (const codeSystem of terminologyCapabilities?.codeSystem || []) {
    const uri = codeSystem?.uri
    if (!uri) continue
    const versions = codeSystem.version || []
    versionsByUri[uri] = versions.map((v) => v.code).filter((code): code is string => !!code)
    codeSystems.push({
      uri,
      name: namesByUri[uri] || uri,
      // Use terminology server defined default version, or first version if none defined. //TODO: currently not used
      latestVersion: (versions.find((v) => v.isDefault) || versions[0])?.code
    })
  }

  return { codeSystems, versionsByUri }
}

/**
 * Map CodeSystem.url to CodeSystem.name (or falling back to CodeSystem.title).
 */
const getNames = async (client: Client): Promise<Record<string, string>> => {
  let bundle: fhir4.Bundle
  try {
    bundle = (await client.request(CODE_SYSTEM_NAMES_PATH)) as fhir4.Bundle
  } catch {
    console.log('Failed to fetch code system names')
    return {}
  }

  const namesByUri: Record<string, string> = {}
  for (const entry of bundle?.entry || []) {
    const codeSystem = entry?.resource as fhir4.CodeSystem | undefined
    const name = codeSystem?.name || codeSystem?.title
    if (codeSystem?.url && name && !namesByUri[codeSystem.url]) {
      namesByUri[codeSystem.url] = name
    }
  }
  return namesByUri
}

/** Drops cached catalogues. Exported for tests. */
const clearCatalogueCache = () => cache.clear()

export { getCodeSystemCatalogue, clearCatalogueCache }
export type { AvailableCodeSystem, CodeSystemCatalogue }
