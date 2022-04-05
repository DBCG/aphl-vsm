// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from '../../../fhirClients'

interface Query {
  [key: string]: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<any> {
  if (req.method === 'GET') {
    console.log('req.query: ', req.query)
    try {
      let queries: Query = {}
      // partial match doesn't work on ID, maybe because isn't a string
      if (req.query['id']) {
        queries['_id:contains'] = req.query['id']
      } if (req.query['name']) {
        queries['name:contains'] = req.query['name']
      } if (req.query['description']) {
         queries['description:contains'] = req.query['description']
      } if (req.query['title']) {
        queries['title:contains'] = req.query['title']
      }

      const data = await fhirCdrClient.search({
        resourceType: 'Library',
        searchParams: {
          context: 'triggering-valueset-library',
          _sort: ['-date'],
          ...queries
        }
      })

      const libs = data?.entry?.map((e: any) => e?.resource)
      const json = JSON.stringify(libs)
      res.status(200).send(json)

    } catch (e) {
      console.error('error:  ', e.response.data.text)
      res.status(400).json({ error: 'Search for program failed.' })
    }
  }
}
