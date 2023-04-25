import type { NextApiRequest, NextApiResponse } from 'next'

// this only gets the program library
export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<any> {
  if (req.method === 'POST') {
    const response = await fetch(`${process.env.FHIR_CDR_URL}/$publish`, {
      method: 'POST',
      headers: {
        'cache-control': 'no-cache',
        'content-type': 'application/json'
      },
      body: req.body
    })

    res.send(response)
  }
}
