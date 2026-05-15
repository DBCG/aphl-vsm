import { ARTIFACT_ROUTE_URL } from '@/constants'

/**
 * Returns the `crmi-artifactRoute` extension value on an Endpoint, or undefined
 * if the extension is absent / has no value.
 */
const getArtifactRoute = (endpoint: fhir4.Endpoint): string | undefined => {
  const value = endpoint.extension?.find((ext) => ext.url === ARTIFACT_ROUTE_URL)?.valueUri
  return value && value.length > 0 ? value : undefined
}

/**
 * Picks the terminology Endpoint that should serve queries for `canonical`.
 *
 * Routing rules:
 * 1. Among endpoints whose `crmi-artifactRoute` is a prefix of `canonical`,
 *    pick the one with the longest route (most specific match).
 * 2. If no endpoint matches, fall back to the single endpoint that has no
 *    `crmi-artifactRoute` extension (the "default" terminology server).
 * 3. If neither a match nor a fallback exists, return `undefined`.
 *
 * Pure: does not perform I/O.
 */
const pickEndpointForCanonical = (
  canonical: string,
  endpoints: fhir4.Endpoint[]
): fhir4.Endpoint | undefined => {
  if (!canonical || !endpoints?.length) return undefined

  let best: { endpoint: fhir4.Endpoint; routeLength: number } | undefined
  let fallback: fhir4.Endpoint | undefined

  for (const endpoint of endpoints) {
    const route = getArtifactRoute(endpoint)
    if (route === undefined) {
      // Convention: there is at most one no-artifactRoute fallback endpoint.
      if (!fallback) fallback = endpoint
      continue
    }
    if (canonical.startsWith(route)) {
      if (!best || route.length > best.routeLength) {
        best = { endpoint, routeLength: route.length }
      }
    }
  }

  return best?.endpoint ?? fallback
}

export { getArtifactRoute, pickEndpointForCanonical }
