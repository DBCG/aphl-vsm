import { NextApiRequest, NextApiResponse } from 'next'
import { terminologyClient } from 'fhirClients'
import { tsCredentialService } from '@/backend/services/TsCredentialService'
import { VSMSession } from '@/helpers/rolesHelper'
import handler from '@/helpers/server/handler'
import FhirClient from '@/backend/clients/FhirClient'
import Logger from '@/helpers/server/logger'

const testTermEndpoint = async (req: NextApiRequest, res: NextApiResponse, session: VSMSession) => {
  try {
    const { endpointId } = req.query
    const authCredentials = await tsCredentialService.getCredentials(session?.user?.id, endpointId as string)

    const endpointBundle = await FhirClient.getInstance().search({
      resourceType: 'Endpoint',
    })
  
    const endpoints = endpointBundle?.entry?.map((e: fhir4.BundleEntry) => e?.resource as fhir4.Endpoint)

    const matchingEndpoint = endpoints?.find((e: fhir4.Endpoint) => e?.id === endpointId)
  
    terminologyClient.setCustomClient({
      clientName: matchingEndpoint.name as string,
      baseUrl: matchingEndpoint.address as string,
      basicAuthHeader: `${Buffer.from(`${authCredentials.username}:${authCredentials.password}`).toString('base64')}`
    })

    const activeTerminologyClient = await terminologyClient.getClient()
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