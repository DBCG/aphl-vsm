// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from 'fhirClients'

// this only gets the program library
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<any> {
  if (req.method === 'GET') {
    try {
      // querying /api/test/123 or w.e. will enact this
      


    } catch (e: any) {
      console.error('error:  ', e?.response?.data?.text)
      res.status(400).json({ error: 'Search for program by id failed.' })
    }
  }
}
