// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from 'fhirClients';
import { getSession } from 'next-auth/react';
import { useGetPrograms } from '@/hooks/useGetPrograms';
import { useRouter } from 'next/router';


//const router = useRouter()
// this code ingests a FHIR Library, and will POST a modified clone as a template
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<any> {
  const session = await getSession({ req })
  if (!session) {
    res.status(401).end()
  }
  // create library template
  req.method = 'POST'
  
  try {
    // update the program by id
    console.log("in api template")
    console.log('body: ' + req.body)
    const response = await fhirCdrClient.create({
      resourceType: 'Library',
      //id: req.query['id'] as string,
      body: req.body,
    })
    res.send(response)
  } catch (e: any) {
    console.error('error:  ', e?.response?.data?.text)
    res.status(400).json({ error: 'Creation of new library failed.' })
  }
}