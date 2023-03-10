// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from 'fhirClients'

// this only gets the program library
export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<any> {
  if (req.method === 'GET') {
    try {
      const data = await fhirCdrClient.search({
        resourceType: 'ValueSet',
        searchParams: {
          url: process.env.CONDITIONS_CANONICAL as string
        }
      })

      // this will return a set of code/display pairs, along with their system info
      // e.g. SNOMED, ICD-10, etc. (our data is just snomed)
      const valueSet = data?.entry?.[0]?.resource?.compose?.include
      res.status(200).send(valueSet)
    } catch (e: any) {
      console.error('error:  ', e?.response?.data?.text)
      res.status(400).json({ error: 'Search for conditions valueset failed.' })
    }
  }
}
