// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from 'fhirClients';
import { Router, useRouter } from 'next/router';


//const router = useRouter()
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
    const res = await fhirCdrClient.create({
      resourceType: 'Library',
      body: req.body,
    })

    if(res.status(200)) {
      //router.push(`/programs/${id}`)
    } else {
      res.status(400).json({ error: 'Creation of new library failed.' })
    }
  } catch (e: any) {
    console.error('error:  ', e)
    res.status(400).json({ error: 'Creation of new library failed.' })
  }
}

//export async function getStaticProps() {
//
//}