import type { NextApiRequest, NextApiResponse } from 'next'
import { fetch as f } from 'undici'
import handler from '@/helpers/server/handler'
import Logger from '@/helpers/server/logger'
import { VSMSession } from '@/helpers/rolesHelper'
import { resolveTerminologyEndpointForCanonical } from '@/helpers/server/resolveTerminologyEndpoint'
import { getArtifactRoute } from '@/helpers/server/endpointResolution'

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
 * artifactRoute), then calls `CodeSystem?url={canonical}&_summary=true` against
 * it and returns the distinct `version` values.
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

  const url = `${baseUrl}/CodeSystem?url=${encodeURIComponent(canonical)}&_summary=true&_count=200`
  const headers: Record<string, string> = { Accept: 'application/fhir+json' }
  if (credentials?.username && credentials?.password) {
    const basic = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64')
    headers.Authorization = `Basic ${basic}`
  }

  Logger.getLogger().info(`Fetching CodeSystem versions for ${canonical} from ${baseUrl}`)

  let bundle: fhir4.Bundle
  try {
    const response = await f(url, { method: 'GET', headers })
    if (!response.ok) {
      const text = await response.text().catch(() => '')
      Logger.getLogger().warn(`Terminology server returned ${response.status} for ${url}: ${text}`)
      return res.status(502).json({ error: `Terminology server returned ${response.status}` })
    }
    bundle = (await response.json()) as fhir4.Bundle
  } catch (e: any) {
    Logger.getLogger().error(`Failed to query terminology server: ${e?.message || e}`)
    return res.status(502).json({ error: e?.message || 'Failed to query terminology server' })
  }

  const versions: string[] = []
  for (const entry of bundle.entry ?? []) {
    const resource = entry.resource as fhir4.CodeSystem | undefined
    const version = resource?.version
    if (version && !versions.includes(version)) {
      versions.push(version)
    }
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
