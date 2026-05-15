import FhirClient from '@/backend/clients/FhirCdrClient'
import { tsCredentialService } from '@/backend/services/TsCredentialService'
import { TerminologyServerCredentials } from '@/backend/model/TerminologyServerCredential'
import { pickEndpointForCanonical } from '@/helpers/server/endpointResolution'

interface ResolvedTerminologyEndpoint {
  endpoint: fhir4.Endpoint
  credentials?: TerminologyServerCredentials
}

/**
 * Returns the terminology Endpoint that should serve queries for `canonical`,
 * along with the requesting user's stored credentials for that Endpoint (if any).
 *
 * Uses `pickEndpointForCanonical` for the routing rules (longest-prefix
 * artifactRoute match, falling back to the no-artifactRoute Endpoint).
 *
 * Throws when no Endpoint can be resolved for the canonical.
 * Returns the Endpoint without credentials when the user has not configured
 * any for it — callers should decide whether to proceed unauthenticated.
 */
const resolveTerminologyEndpointForCanonical = async (
  userId: string,
  canonical: string
): Promise<ResolvedTerminologyEndpoint> => {
  const endpointBundle = (await FhirClient.getInstance().search({
    resourceType: 'Endpoint',
    searchParams: { identifier: 'terminologyEndpoint' }
  })) as fhir4.Bundle
  const endpoints = endpointBundle?.entry?.map((e) => e.resource as fhir4.Endpoint) || []
  const endpoint = pickEndpointForCanonical(canonical, endpoints)
  if (!endpoint) {
    throw new Error(`No terminology server configured for canonical: ${canonical}`)
  }

  let credentials: TerminologyServerCredentials | undefined
  try {
    credentials = await tsCredentialService.getCredentials(userId, endpoint.id!)
  } catch {
    // No stored credentials for this user + endpoint pair. That's allowed —
    // some endpoints (or some queries) are reachable unauthenticated.
    credentials = undefined
  }

  return { endpoint, credentials }
}

export { resolveTerminologyEndpointForCanonical }
export type { ResolvedTerminologyEndpoint }
