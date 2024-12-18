import { NextApiRequest, NextApiResponse } from 'next'
import { terminologyClient } from 'fhirClients'

const testTermEndpoint = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { endpointUrl, endpointName, username, password } = req.query
    terminologyClient.setCustomClient({
      clientName: endpointName as string,
      baseUrl: endpointUrl!.toString() as string,
      basicAuthHeader: `${Buffer.from(`${username}:${password}`).toString('base64')}`
    })

    const activeTerminologyClient = await terminologyClient.getClient()
    if (activeTerminologyClient) {
      const serverResponse = await activeTerminologyClient.request('/metadata')
      // @ts-ignore
      if (serverResponse?.resourceType == 'Bundle') {
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