import { NextApiRequest, NextApiResponse } from 'next'
import { terminologyClient } from 'fhirClients'

const testTermEndpoint = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { endpointUrl, endpointName, username, password } = req.query
    console.log('req here: ' , req.query)
    terminologyClient.setCustomClient({
      clientName: endpointName as string,
      baseUrl: endpointUrl!.toString() as string,
      basicAuthHeader: `${Buffer.from(`${username}:${password}`).toString('base64')}`
    })

    console.log("'terminologyClient: ", terminologyClient)
    console.log('username: ', username)
    console.log('password: ', password)
    const activeTerminologyClient = await terminologyClient.getClient()
    if (activeTerminologyClient) {
      const serverResponse = await activeTerminologyClient.request('/ValueSet?_count=1')
      console.log('res here: ', serverResponse)
      console.log('serverRes.resoruceType: ', serverResponse?.resourceType)
      if (serverResponse?.resourceType == 'Bundle') {
        console.log('testTermEndpoint: success')
        return res.status(200).json({ status: 'ok' })
      } else {
        return res.status(500).json({ error: 'Invalid terminology server credentials' })
      }
    }
    return res.status(500).json({ error: 'No terminology server' })

  } catch (e) {
    console.error('ERRRor: ', e)
    console.error(e)
    return res.status(500).json({ error: 'Error occurred' })
  }
}

export default testTermEndpoint