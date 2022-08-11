// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'

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
  
  // create library template
  if (req.method === 'POST') {
    try {
      let queries: Query = {}
      let fieldCnt = 0;
      // partial match doesn't work on ID, maybe because isn't a string
      req.query['id'] = 'ersd20211229';
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
      if(fieldCnt > 0) {
        const body = JSON.parse(req.body)
        const { data } = body
      
        const dataRes = await fetch('http://localhost:8080/fhir/$createNewVersion', {
          body: data,
          headers: { 
            'Content-Type': 'application/json',
          },
          method: 'POST'
        });
        const json = await dataRes.json();
        res.status(200).send(json)
      } else {
        res.status(400).json({ error: 'Search data is missing to get library. One or more fields need to be filled out.' })
      }

    } catch (e: any) {
      console.error('error creating new library:  ', e?.response?.data?.text)
      res.status(400).json({ error: 'Creation of new library failed.' })
    }
  }
}
