// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from 'fhirClients'

// this code ingests a FHIR Library, and will POST a modified clone as a template
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<any> {

  // create library template
  try {
    let bodyJson = JSON.stringify(req.body)
    const response = await fhirCdrClient.request('Library/$draft', {
      method: 'POST',
      body: bodyJson,
    })

    res.send(response)
  } catch (e: any) {
    console.error('error:  ', e.response.data)
    res.status(400).json({ error: 'Creation of new library failed.' })
  }
}
