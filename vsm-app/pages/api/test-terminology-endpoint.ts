import { NextApiRequest, NextApiResponse } from 'next'
import { terminologyClient } from 'fhirClients'
import { tsCredentialService } from '@/backend/services/TsCredentialService'
import { AuthOptions } from "@/pages/api/auth/[...nextauth]"
import { getServerSession } from 'next-auth/next'

const testTermEndpoint = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { endpointUrl, endpointName, endpointId } = req.query
    const session = await getServerSession(req, res, AuthOptions)
    const authCredentials = await tsCredentialService.getCredentials(session?.user?.id, endpointId as string)

    terminologyClient.setCustomClient({
      clientName: endpointName as string,
      baseUrl: endpointUrl!.toString() as string,
      basicAuthHeader: `${Buffer.from(`${authCredentials.username}:${authCredentials.password}`).toString('base64')}`
    })

    const activeTerminologyClient = await terminologyClient.getClient()
    if (activeTerminologyClient) {
      const serverResponse = await activeTerminologyClient.request('/metadata')
      // @ts-ignore
      if (serverResponse?.resourceType == 'CapabilityStatement') {
        return res.status(200).json({ status: 'ok' })
      } else {
        return res.status(500).json({ error: 'Invalid terminology server credentials' })
      }
    }
    return res.status(500).json({ error: 'No terminology server' })

  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Error occurred' })
  }
}

export default testTermEndpoint