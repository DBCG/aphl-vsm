// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from 'fhirClients'
import { getSession } from 'next-auth/react'


interface Query {
  '_id:contains'?: string,
  'name:contains'?: string,
  'description:contains'?: string,
  'title:contains'?: string,
  'version:contains'?: string,
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
      let queries: Query = {}
      let fieldCnt = 0;
      // partial match doesn't work on ID, maybe because isn't a string
      req.query['id'] = 'ersd20211229';
      console.log('req.query: ' + req.query);
      if (req.query['id']) {
        queries['_id:contains'] = req.query['id'] as string
        fieldCnt =fieldCnt +1;
      } if (req.query['name']) {
        queries['name:contains'] = req.query['name'] as string
        fieldCnt =fieldCnt +1;
      } if (req.query['description']) {
        queries['description:contains'] = req.query['description'] as string
        fieldCnt =fieldCnt +1;
      } if (req.query['title']) {
        queries['title:contains'] = req.query['title'] as string
        fieldCnt =fieldCnt +1;
      } if (req.query['version']) {
        queries['version:contains'] = req.query['version'] as string
        fieldCnt =fieldCnt +1;
      }
      console.log('fieldCnt: ' + fieldCnt)
      if(fieldCnt > 0) {
        console.log('calling search')
        const searchResult = await fhirCdrClient.search({
          resourceType: 'Library',
          searchParams: {
            context: 'program',
            _sort: ['-date'],
            ...queries
          }
        })
      
        console.log('searchResult: ' + searchResult?.type)
        const programs = searchResult?.entry?.map((e: any) => e?.Library)
        console.log('programs: ' + programs)
        const json = JSON.stringify(programs)
        console.log('json: ' + json)
        //return json
        res.status(200).send(json)
      } else {
        res.status(400).json({ error: 'Search for program failed.' })
      }

    } catch (e: any) {
      console.error('error programs:  ', e)
      res.status(400).json({ error: 'Search for program failed.' })
    }
  }
}
