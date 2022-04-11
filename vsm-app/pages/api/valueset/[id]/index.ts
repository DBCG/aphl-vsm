import type { NextApiRequest, NextApiResponse } from 'next'
import { vsacFhirClient } from '../../../../fhirClients'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<any> {
  if (req.method === 'GET') {
    console.log('HIT')
    const { id } = req.query
    const decodedUrl = decodeURIComponent(id)
    console.log('decoded: ', decodedUrl)
    try {

      const response =  await vsacFhirClient.search({
        resourceType: 'ValueSet',
        // searchParams: { 'url': decodedUrl }
      })

      console.log('resonse: ', response)

      res.status(200).send(response)
    } catch (e) {
      console.error('error: ', e)
      res.status(400).json({ error: 'Loading ValueSets failed' })
    }
  }
}