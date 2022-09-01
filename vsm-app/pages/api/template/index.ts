// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from 'fhirClients';

// this code ingests a FHIR Library, and will POST a modified clone as a template
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<any> {
  // create library template
  
  try {
    let bodyObj = JSON.parse(req.body)
    // deleting mutates the object, deleting the id key
    delete bodyObj.id
    delete bodyObj.version
    const current = new Date();
    const date = `${current.getDate()}/${current.getMonth()+1}/${current.getFullYear()}`;
    bodyObj.version = 'draft-' + date;
    const response = await fhirCdrClient.create({
      resourceType: 'Library',
      body: bodyObj,
    })

    res.send(response);
  } catch (e: any) {
    console.error('error:  ', e)
    res.status(400).json({ error: 'Creation of new library failed.' })
  }
}
