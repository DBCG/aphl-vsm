import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import appCache from 'cache'
import logger from '@/helpers/server/logger'
import { fhirCdrClient } from '@/fhirClients'

// this only gets the program library
const release = async (req: NextApiRequest, res: NextApiResponse): Promise<any> => {
  const toReleaseLibrary = JSON.parse(req?.body)
  const releasePayload = {
    resourceType: 'Parameters',
    parameter: [
      {
        name: 'version',
        valueString: toReleaseLibrary?.version
      },
      {
        name: 'versionBehavior',
        valueCode: 'default'
      }
    ]
  }

  const response = await fhirCdrClient.operation({
    name: '$release',
    resourceType: 'Library',
    id: req.query.id as string,
    method: 'POST',
    input: releasePayload
  })

  if (!response.ok) {
    logger.error('error', response.status, response.statusText)
    return res.status(response.status).json({ error: response.statusText })
  }

  const libraryUpdateResponse = await fhirCdrClient.update({
    resourceType: 'Library',
    id: req.query.id as string,
    body: req.body
  })

  if (!libraryUpdateResponse) {
    logger.error('error updating library', libraryUpdateResponse)
    return res.status(400).json(libraryUpdateResponse)
  }

  return res.send(libraryUpdateResponse)
}

export default handler({
  POST: {
    action: release,
    access: ['admin', 'editor']
  }
})
