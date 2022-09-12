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
    console.log('body Obj: ', bodyObj)
    // deleting mutates the object, deleting the ids key
    delete bodyObj.id
    delete bodyObj.version
    bodyObj.status = 'draft'
    const current = new Date();
    const date = `${current.getFullYear()}-${current.getMonth() + 1}-${current.getDate()}`
    bodyObj.version = date
    const response = await fhirCdrClient.create({
      resourceType: 'Library',
      body: bodyObj,
    })
    console.log('response: ', response)
    res.send(response)
  } catch (e: any) {
    console.error('error:  ', e)
    res.status(400).json({ error: 'Creation of new library failed.' })
  }
}
