import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'

// this only gets the program library
const release = async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<any> => {

  if (req.method === 'POST') {
    const libraryUpdateResponse = await fetch(`${process.env.FHIR_CDR_URL}/Library/${req.query.id}`, {
      method: 'PUT',
      headers: {
        'cache-control': 'no-cache',
        'content-type': 'application/json'
      },
      body: req.body
    })

    if (!libraryUpdateResponse.ok) {
      console.error('error updating library', libraryUpdateResponse.status, libraryUpdateResponse.statusText)
      return res.status(libraryUpdateResponse.status).json({ error: libraryUpdateResponse.statusText })
    }

    const response = await fetch(`${process.env.FHIR_CDR_URL}/Library/${req.query.id}/$release`, {
      method: 'POST',
      headers: {
        'cache-control': 'no-cache',
        'content-type': 'application/json'
      },
      body: req.body
    })

    console.log('response: ', response)

    if (!response.ok) {
      console.error('error', response.status, response.statusText)
      return res.status(response.status).json({ error: response.statusText })
    }
    return res.send(response)
  }
}

export default handler({
  POST: {
    action: release,
    access: ['admin', 'editor']
  }
})
