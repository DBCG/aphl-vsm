import type { NextApiRequest, NextApiResponse } from 'next'
import { vsacFhirClient } from 'fhirClients'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<any> {
  if (req.method === 'GET') {

    const id = req.query.id as string
    const decodedUrl = decodeURIComponent(id)

    try {

      const response = await vsacFhirClient.search({
        resourceType: 'ValueSet',
        // searchParams: { 'url': decodedUrl }
      })

      res.status(200).send(response)
    } catch (e) {
      console.error('error: ', e)
      res.status(400).json({ error: 'Loading ValueSets failed' })
    }
  }
}