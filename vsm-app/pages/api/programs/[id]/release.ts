import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import appCache from 'cache'
import logger from '@/helpers/server/logger'

// this only gets the program library
const release = async (req: NextApiRequest, res: NextApiResponse): Promise<any> => {
  const cache = appCache?.getInstance()

  const libraryUpdateResponse = await fetch(`${process.env.FHIR_CDR_URL}/Library/${req.query.id}`, {
    method: 'PUT',
    headers: {
      'cache-control': 'no-cache',
      'content-type': 'application/json'
    },
    body: req.body
  }).then((res) => res?.json())

  if (!libraryUpdateResponse) {
    logger.error('error updating library', libraryUpdateResponse)
    return res.status(400).json(libraryUpdateResponse)
  }
  cache?.set(`Library/${libraryUpdateResponse.id}`, JSON.stringify(libraryUpdateResponse))
  const response = await fetch(`${process.env.FHIR_CDR_URL}/Library/${req.query.id}/$release`, {
    method: 'POST',
    headers: {
      'cache-control': 'no-cache',
      'content-type': 'application/json'
    },
    body: req.body
  })

  if (!response.ok) {
    logger.error('error', response.status, response.statusText)
    return res.status(response.status).json({ error: response.statusText })
  }
  return res.send(response)
}

export default handler({
  POST: {
    action: release,
    access: ['admin', 'editor']
  }
})
