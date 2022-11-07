// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from 'fhirClients'
import { getSession } from 'next-auth/react'

interface Query {
  '_id:contains'?: string,
  'name:contains'?: string,
  'description:contains'?: string,
  'title:contains'?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<any> {
  const session = await getSession({ req })
  if (!session) {
    res.status(401).end()
  }

  if (req.method === 'GET') {
    try {
      // should program status only be draft here? or also active?
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
        options: {
          headers: {
            'Cache-control': 'no-cache, no-store, must-revalidate'
          },
        },
        searchParams: {
          context: 'program',
          _sort: ['-_lastUpdated'],
          ...queries
        }
      })

      if (searchResult.entry) {
        const programs = searchResult?.entry?.map((e: any) => e?.resource)
        const json = JSON.stringify(programs)
        res.status(200).send(json)
      } else {
        console.error(searchResult)
        res.status(404).send([])
      } 

    } catch (e: any) {
      console.error('error programs:  ', e.response.data.text)
      res.status(400).json({ error: 'Search for program failed.' })
    }
  }
}
