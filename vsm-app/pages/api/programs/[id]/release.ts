import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import logger from '@/helpers/server/logger'
import { fhirCdrClient } from '@/fhirClients'
import { removeDraftFromVersionString } from '@/utils'

// this only gets the program library
const release = async (req: NextApiRequest, res: NextApiResponse): Promise<any> => {
  const toReleaseLibrary = JSON.parse(req?.body)
  try {
    await fhirCdrClient.update<fhir4.Library>({
      resourceType: 'Library',
      id: toReleaseLibrary.id as string,
      body: toReleaseLibrary
    })
  } catch (e) {
    throw(e)
  }
  const releasePayload = {
    resourceType: 'Parameters',
    parameter: [
      {
        name: 'version',
        valueString: removeDraftFromVersionString(toReleaseLibrary?.version)
      },
      {
        name: 'versionBehavior',
        valueCode: 'default'
      }
    ]
  }

  await fhirCdrClient.operation({
    name: '$crmi.release',
    resourceType: 'Library',
    id: req.query.id as string,
    method: 'POST',
    input: releasePayload
  })

  // errors are caught by the handler, processed in handler.ts
  return res.status(200).send({})
}

export default handler({
  POST: {
    action: release,
    access: ['admin', 'editor']
  }
})
