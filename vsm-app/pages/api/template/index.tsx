// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from 'fhirClients'

// this code ingests a FHIR Library, and will POST a modified clone as a template
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<any> {
  
  // create library template
  if (req.method === 'POST') {
    try {
      // const dataRes = await fetch(process.env('fh') {   //http://localhost:8080/fhir/$createNewVersion', {
        //  body: data,
        //  headers: { 
        ///    'Content-Type': 'application/json',
        //  },
        //  method: 'POST'
        //});
        //const json = await dataRes.json();
        //res.status(200).send(json)
      //} else {
      //  res.status(400).json({ error: 'Search data is missing to get library. ID, name, title, and version need to be filled out.' })
      // }

    } catch (e: any) {
      console.error('error creating new library:  ', e?.response?.data?.text)
      res.status(400).json({ error: 'Creation of new library failed.' })
    }
  }
}