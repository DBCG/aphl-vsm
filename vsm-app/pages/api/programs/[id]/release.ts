import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import { fhirCdrClient } from '@/fhirClients'
import { removeDraftFromVersionString } from '@/utils'

// this only gets the program library
const release = async (req: NextApiRequest, res: NextApiResponse): Promise<any> => {
  const {releaseAsVersion, program } = req.body

    if (typeof releaseAsVersion === 'string') {
      program.version = releaseAsVersion
    }

  const releasePayload = {
    resourceType: 'Parameters',
    parameter: [
      {
        name: 'version',
        valueString: removeDraftFromVersionString(program?.version)
      },
      {
        name: 'versionBehavior',
        valueCode: 'force'
      }
    ]
  }

  await fhirCdrClient.operation({
    name: '$release',
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
