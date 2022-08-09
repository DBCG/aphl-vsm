// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
//import { fhirCdrClient } from 'fhirClients'

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
        console.log('data from the FE: ', data)
      
        const dataRes = await fetch('http://localhost:8080/fhir/createNewVersion', {
          body: data,
          headers: { 
            'Content-Type': 'application/json',
          },
          method: 'POST'
        });
        console.log('dataRes: ' + dataRes.body);
        console.log('After the http call');
        // *** I have commented this out for now because I don't think that this will
        // function with our CDR
        // ~~~~~~~~~~~~~~~~~~~~~~
        // const result = fhirCdrClient.request('/createNewVersion', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json',
        //   body: JSON.stringify(libraryTemplateData)
        // })

        // *** Same goes for this
        // ~~~~~~~~~~~~~~~~~~~~~~
        // const result = await fetch(`${process.env.FHIR_CDR_URL}/createNewVersion`, {
        //   method: 'POST',
        //   headers: {
        //     'Content-Type': 'application/json',
        //   },
        //   body: JSON.stringify(libraryTemplateData),
        // })

        let result = {data: 'hello from the server! 1234'}
        res.status(200).send(result)
      } else {
        res.status(400).json({ error: 'Search data is missing to get library. One or more fields need to be filled out.' })
      }

    } catch (e: any) {
      console.error('error creating new library:  ', e?.response?.data?.text)
      res.status(400).json({ error: 'Creation of new library failed.' })
    }
  }
}
