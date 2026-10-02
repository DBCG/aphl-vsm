import type { NextApiRequest, NextApiResponse } from 'next'
import FhirKitClient from 'fhir-kit-client'
import handler from '@/helpers/server/handler'
import Logger from '@/helpers/server/logger'
import { VSMSession } from '@/helpers/rolesHelper'
import { resolveTerminologyEndpointForCanonical } from '@/helpers/server/resolveTerminologyEndpoint'
import { getArtifactRoute } from '@/helpers/server/endpointResolution'
import { getCodeSystemCatalogue } from '@/helpers/server/terminologyCapabilities'

interface VersionsResponse {
  versions: string[]
  source: {
    endpointId: string
    endpointAddress: string
    artifactRoute?: string
  }
}

interface ErrorResponse {
  error: string
}

/**
 * GET /api/codesystem-versions?canonical={canonical}
 *
 * Resolves the terminology Endpoint that should serve queries for the canonical
 * (longest-prefix artifactRoute match, falling back to the Endpoint with no
 * artifactRoute), then reads its TerminologyCapabilities catalogue
 * (`/metadata?mode=terminology`) and returns the versions it lists for the
 * canonical.
 */
const getCodeSystemVersions = async (
  req: NextApiRequest,
  res: NextApiResponse<VersionsResponse | ErrorResponse>,
  session: VSMSession
) => {
  const canonical = (req.query.canonical as string | undefined)?.trim()
  if (!canonical) {
    return res.status(400).json({ error: 'Missing required query parameter: canonical' })
  }

  let endpoint: fhir4.Endpoint
  let credentials
  try {
    const resolved = await resolveTerminologyEndpointForCanonical(session.user.id, canonical)
    endpoint = resolved.endpoint
    credentials = resolved.credentials
  } catch (e: any) {
    Logger.getLogger().warn(`No terminology server configured for canonical: ${canonical}`)
    return res.status(404).json({ error: e?.message || 'No terminology server configured for this canonical' })
  }

  const baseUrl = endpoint.address?.replace(/\/$/, '')
  if (!baseUrl) {
    return res.status(500).json({ error: 'Resolved Endpoint has no address configured' })
  }

  const basic =
    credentials?.username && credentials?.password
      ? Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64')
      : undefined

  Logger.getLogger().info(`Fetching CodeSystem versions for ${canonical} from ${baseUrl}`)

  // Request-scoped client
  const client = new FhirKitClient({
    baseUrl,
    customHeaders: basic ? { Authorization: `Basic ${basic}` } : {}
  })

  let versions: string[]
  try {
    versions = (await getCodeSystemCatalogue(client)).versionsByUri[canonical] || []
  } catch (e: any) {
    Logger.getLogger().error(`Failed to query terminology server: ${e?.message || e}`)
    return res.status(502).json({ error: e?.message || 'Failed to query terminology server' })
  }

  return res.status(200).json({
    versions,
    source: {
      endpointId: endpoint.id!,
      endpointAddress: baseUrl,
      artifactRoute: getArtifactRoute(endpoint)
    }
  })
}

export default handler({
  GET: { access: ['admin', 'publisher', 'editor', 'reviewer'], action: getCodeSystemVersions }
})
