// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from 'fhirClients'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<any> {
  
  let newLibrary = null;
  // create library template
  //if (req.method === 'POST') {
    try {

      //const newLibrary = null;  //searchResult?.entry?.map((e: any) => e?.resource)

      const result = await fetch('${http://localhost:8080/fhir/createNewVersion', {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
      },
      
      body: JSON.stringify(newLibrary),
    })

      //const json = JSON.stringify(newLibrary)
      res.status(200).send(result)

    } catch (e: any) {
      console.error('error creating new library:  ', e?.response?.data?.text)
      res.status(400).json({ error: 'Creation of new library failed.' })
    }
    
  //}
  //if(req.method === 'GET') {
  //  try {
  //    let queries: Query = {}
  //    
  //    if (req.query['id']) {
  //      queries['_id:contains'] = req.query['id'] as string
  //    } if (req.query['name']) {
  //      queries['name:contains'] = req.query['name'] as string
  //    } if (req.query['description']) {
  //      queries['description:contains'] = req.query['description'] as string
  //    } if (req.query['title']) {
  //      queries['title:contains'] = req.query['title'] as string
  //    } if (req.query['version']) {
  //      queries['version:contains'] = req.query['version'] as string
  //    }
  //    const searchResult = await fhirCdrClient.search({
  //      resourceType: 'Library',
  //      searchParams: {
  //        context: 'library',
  //        _sort: ['-date'],
   //       ...queries
  //      }
  //    })
//
  //    const libraries = searchResult?.entry?.map((e: any) => e?.resource)
  //    const json = JSON.stringify(libraries)
  //    res.status(200).send(json)
//
  //  } catch (e: any) {
  //    console.error('error libraries:  ', e?.response?.data?.text)
  //    res.status(400).json({ error: 'Search for libraries failed.' })
  //  }
  //}
}
