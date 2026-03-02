import { NextApiRequest, NextApiResponse } from 'next'
import TerminologyFhirClient from '@/backend/clients/TerminologyFhirClient'
import { tsCredentialService } from '@/backend/services/TsCredentialService'
import { VSMSession } from '@/helpers/rolesHelper'
import handler from '@/helpers/server/handler'
import FhirClient from '@/backend/clients/FhirCdrClient'
import Logger from '@/helpers/server/logger'
import { AUTHENTICATION_TYPE_URL } from '@/constants'

const testTermEndpoint = async (req: NextApiRequest, res: NextApiResponse, session: VSMSession) => {
  try {
    const { endpointId } = req.query

    const endpointBundle = await FhirClient.getInstance().search({
      resourceType: 'Endpoint',
    })

    const endpoints = endpointBundle?.entry?.map((e: fhir4.BundleEntry) => e?.resource as fhir4.Endpoint)

    const matchingEndpoint = endpoints?.find((e: fhir4.Endpoint) => e?.id === endpointId)

    // early return if no matching endpoint exists
    if (!matchingEndpoint) {
      return res.status(500).json({ error: 'No active terminology server endpoint' })
    }

    const authType = matchingEndpoint.extension?.find((ext: fhir4.Extension) => ext.url === AUTHENTICATION_TYPE_URL)?.valueString
    let basicAuthHeader: string | undefined
    if (authType === 'basic') {
      const authCredentials = await tsCredentialService.getCredentials(session?.user?.id, endpointId as string)
      basicAuthHeader = Buffer.from(`${authCredentials.username}:${authCredentials.password}`).toString('base64')
    }

    TerminologyFhirClient.setCustomClient({
      clientName: matchingEndpoint.name as string,
      baseUrl: matchingEndpoint.address as string,
      basicAuthHeader
    })

    const activeTerminologyClient = await TerminologyFhirClient.getClient()
    if (activeTerminologyClient) {
      const serverResponse = await activeTerminologyClient.request('/metadata')
      // @ts-ignore
      if (serverResponse?.resourceType == 'CapabilityStatement') {
        return res.status(200).json({ status: 'ok' })
      } else {
        Logger.getLogger().error(serverResponse)
        return res.status(500).json({ error: 'Invalid terminology server credentials' })
      }
    }
    return res.status(500).json({ error: 'No terminology server' })

  } catch (e) {
    Logger.getLogger().error(e)
    return res.status(500).json({ error: 'Error occurred' })
  }
}

export default handler({
  GET: { action: testTermEndpoint, access: ['admin', 'editor', 'reviewer'] },
})