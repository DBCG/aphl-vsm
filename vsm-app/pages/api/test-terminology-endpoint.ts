import { NextApiRequest, NextApiResponse } from 'next'
import { terminologyClient } from 'fhirClients'
import { tsCredentialService } from '@/backend/services/TsCredentialService'
import { VSMSession } from '@/helpers/rolesHelper'

const testTermEndpoint = async (req: NextApiRequest, res: NextApiResponse, session: VSMSession) => {
  try {
    const { endpointUrl, endpointName, endpointId } = req.query
    console.log('session is not populated: ', session)
    const authCredentials = await tsCredentialService.getCredentials(session?.user?.id, endpointId as string)

    terminologyClient.setCustomClient({
      clientName: endpointName as string,
      baseUrl: endpointUrl!.toString() as string,
      basicAuthHeader: `${Buffer.from(`${authCredentials.username}:${authCredentials.password}`).toString('base64')}`
    })

    const activeTerminologyClient = await terminologyClient.getClient()
    if (activeTerminologyClient) {
      const serverResponse = await activeTerminologyClient.request('/metadata')
      console.log('serverResponse', serverResponse)
      // @ts-ignore
      if (serverResponse?.resourceType == 'CapabilityStatement') {
        return res.status(200).json({ status: 'ok' })
      } else {
        return res.status(500).json({ error: 'Invalid terminology server credentials' })
      }
    }
    return res.status(500).json({ error: 'No terminology server' })

  } catch (e) {
    console.log('error here!!!')
    console.error(e)
    return res.status(500).json({ error: 'Error occurred' })
  }
}

export default testTermEndpoint