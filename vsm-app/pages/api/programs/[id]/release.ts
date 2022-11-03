// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from 'next-auth/react'

// this only gets the program library
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<any> {
  const session = await getSession({ req })
  if (!session) {
    res.status(401).end()
  }

  if (req.method === 'POST') {
    const response = await fetch(`${process.env.FHIR_CDR_URL}/Library/${req.body.id}/$release`, {
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
