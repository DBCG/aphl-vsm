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
  req.method = 'POST'
  
  try {
    // update the program by id
    console.log("in api template")
    const body = await req.body
    console.log('body: ' + body)
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
    console.error('error:  ', e?.response?.data?.text)
    res.status(400).json({ error: 'Creation of new library failed.' })
  }
}

//export async function getStaticProps() {
//
//}