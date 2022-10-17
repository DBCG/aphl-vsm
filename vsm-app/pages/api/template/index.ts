// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'

// this code ingests a FHIR Library, and will POST a modified clone as a template
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<any> {

  // create library template
  try {
    let body = JSON.parse(req.body)

    const postBody = JSON.stringify({
      resourceType: 'Parameters',
      parameter: [
        {
          name: 'specification',
          resource: body
        }
      ]
    })

    const response = await fetch(`${process.env.NEXT_PUBLIC_FHIR_CDR_URL}/$draft`, {
      method: 'POST',
      headers: {
        'cache-control': 'no-cache',
        'content-type': 'application/json'
      },
      body: postBody
    })

    res.send(response)
  } catch (e: any) {
    console.error('error:  ', e)
    res.status(400).json({ error: 'Creation of new library failed.' })
  }
}
