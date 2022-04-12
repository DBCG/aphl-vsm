// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from '../../../fhirClients'

interface Query {
  '_id:contains'?: string,
  'name:contains'?: string,
  'description:contains'?: string,
  'title:contains'?: string,
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
        queries['_id:contains'] = req.query['id'] as string
      } if (req.query['name']) {
        queries['name:contains'] = req.query['name'] as string
      } if (req.query['description']) {
         queries['description:contains'] = req.query['description'] as string
      } if (req.query['title']) {
        queries['title:contains'] = req.query['title'] as string
      }

      const searchResult = await fhirCdrClient.search({
        resourceType: 'Library',
        searchParams: {
          context: 'program',
          _sort: ['-date'],
          ...queries
        }
      })
      
      
      const programs = searchResult?.entry?.map((e: any) => e?.resource)
      const json = JSON.stringify(programs)
      res.status(200).send(json)

    } catch (e: any) {
      console.error('error:  ', e?.response?.data?.text)
      res.status(400).json({ error: 'Search for program failed.' })
    }
  }
}
