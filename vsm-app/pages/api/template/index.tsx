// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
//import { fhirCdrClient } from 'fhirClients'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<any> {
  
  // create library template
  if (req.method === 'POST') {
    try {
      const body = JSON.parse(req.body)
      const { data } = body
      console.log('data from the FE: ', data)

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

      let result = {data: 'hello from the server!'}
      res.status(200).send(result)

    } catch (e: any) {
      console.error('error creating new library:  ', e?.response?.data?.text)
      res.status(400).json({ error: 'Creation of new library failed.' })
    }
    
  }
}
