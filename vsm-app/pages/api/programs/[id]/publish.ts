import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'

// this only gets the program library
const publishLibrary = async (req: NextApiRequest, res: NextApiResponse) => {
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

export default handler({
  POST: {
    action: publishLibrary,
    access: ['admin', 'editor']
  }
})
