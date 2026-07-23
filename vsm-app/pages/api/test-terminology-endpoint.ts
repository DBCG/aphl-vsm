import { NextApiRequest, NextApiResponse } from 'next'
import FhirKitClient from 'fhir-kit-client'
import { tsCredentialService } from '@/backend/services/TsCredentialService'
import { VSMSession } from '@/helpers/rolesHelper'
import handler from '@/helpers/server/handler'
import FhirClient from '@/backend/clients/FhirCdrClient'
import Logger from '@/helpers/server/logger'
import { AUTHENTICATION_TYPE_URL, AUTH_TYPE } from '@/constants'

const testTermEndpoint = async (req: NextApiRequest, res: NextApiResponse, session: VSMSession) => {
  try {
    const { endpointId } = req.query

    if (!endpointId) {
      return res.status(400).json({ error: 'endpointId is required' })
    }

    // Read the endpoint directly by id. A prior implementation searched all
    // Endpoints (unfiltered, unpaginated) and found by id, which silently failed
    // for any endpoint outside the server's default result window — e.g. a
    // freshly-created one — making it perpetually "invalid".
    let matchingEndpoint: fhir4.Endpoint | undefined
    try {
      matchingEndpoint = (await FhirClient.getInstance().read({
        resourceType: 'Endpoint',
        id: endpointId as string
      })) as fhir4.Endpoint
    } catch {
      matchingEndpoint = undefined
    }

    if (!matchingEndpoint) {
      return res.status(404).json({ error: 'Terminology endpoint not found' })
    }

    // Stored value is the option KEY (AUTH_TYPE.BASIC | AUTH_TYPE.NONE), not the
    // label — shared via constants with the endpoint form and settings page.
    const authType = matchingEndpoint.extension?.find((ext: fhir4.Extension) => ext.url === AUTHENTICATION_TYPE_URL)?.valueString
    let basicAuthHeader: string | undefined
    if (authType === AUTH_TYPE.BASIC) {
      // getCredentials throws when none are stored.
      let authCredentials
      try {
        authCredentials = await tsCredentialService.getCredentials(session?.user?.id, endpointId as string)
      } catch {
        authCredentials = undefined
      }
      if (authCredentials?.username && authCredentials?.password) {
        basicAuthHeader = Buffer.from(`${authCredentials.username}:${authCredentials.password}`).toString('base64')
      } else {
        // Auth required but no credentials configured yet. This is a distinct
        // state from "invalid/unreachable" — the endpoint just isn't ready to use.
        return res.status(200).json({ status: 'no-credentials' })
      }
    }

    // Build a request-scoped client. Do NOT mutate the shared TerminologyFhirClient
    // singleton here — the settings page tests every endpoint concurrently, and a
    // shared mutable client races (one request's base URL/auth clobbers another's).
    const activeTerminologyClient = new FhirKitClient({
      baseUrl: matchingEndpoint.address as string,
      customHeaders: basicAuthHeader ? { Authorization: `Basic ${basicAuthHeader}` } : {}
    })

    const serverResponse = await activeTerminologyClient.request('/metadata')
    // @ts-ignore
    if (serverResponse?.resourceType == 'CapabilityStatement') {
      return res.status(200).json({ status: 'ok' })
    } else {
      // @ts-ignore
      Logger.getLogger().error(`Endpoint ${endpointId} returned non-CapabilityStatement: resourceType=${serverResponse?.resourceType}`)
      return res.status(500).json({ error: 'Invalid terminology server response' })
    }

  } catch (e: any) {
    // Log message + stack as strings — passing an Error object to pino is dropped
    // by this app's custom messageFormat (only log.msg is printed).
    Logger.getLogger().error(`test-terminology-endpoint failed for ${req.query.endpointId}: ${e?.message || e}`)
    if (e?.stack) Logger.getLogger().error(`Stack: ${e.stack}`)
    if (e?.response?.status) Logger.getLogger().error(`Upstream status: ${e.response.status}`)
    return res.status(500).json({ error: e?.message || 'Error occurred' })
  }
}

export default handler({
  GET: { action: testTermEndpoint, access: ['admin', 'publisher', 'editor', 'reviewer'] },
})