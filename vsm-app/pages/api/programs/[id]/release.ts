// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'

// this only gets the program library
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<any> {

  if (req.method === 'POST') {
    const response = await fetch(`${process.env.FHIR_CDR_URL}/Library/${req.query.id}/$release`, {
      method: 'POST',
      headers: {
        'cache-control': 'no-cache',
        'content-type': 'application/json'
      },
      body: req.body
    })

    if (!response.ok) {
      console.error('error', response.status, response.statusText)
      return res.status(400).json({ error: response.statusText })
    }
    return res.send(response)
  }
}
