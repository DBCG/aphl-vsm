// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from '../../../../fhirClients'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<any> {
  if (req.method === 'GET') {
    try {

      const grouperLibrary = await fhirCdrClient.search({
        resourceType: 'Library',
        searchParams: {
          url: req.query.url
        }
      })

      const grouperJson = JSON.stringify(grouperLibrary)

      const grouperUrls = grouperJson?.entry


      res.status(200).send(json)

    } catch (e: any) {
      console.error('error:  ', e?.response?.data?.text)
      res.status(400).json({ error: 'Search for program by id failed.' })
    }
  }
}
