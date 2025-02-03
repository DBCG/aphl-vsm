import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import FhirClient from '@/backend/clients/FhirClient'
import { removeDraftFromVersionString } from '@/utils'
import { logSimpleError } from '@/helpers/server/simpleHapiError'
import {
  getReleaseDescription,
  getReleaseLabel,
  setReleaseDescription,
  setEffectivePeriodStart,
  setReleaseLabel
} from '@/helpers/libraryHelpers'
import { ReleasePayload } from '@/components/modals/ReleaseModal'
import { addTerminologyEndpointToParameters } from '@/helpers/fhirResourceHelper'
export interface ReleaseRequest extends NextApiRequest {
  body: ReleasePayload
}
// this only gets the program library
const release = async (req: ReleaseRequest, res: NextApiResponse): Promise<any> => {
  const { releaseAsVersion, programId, releaseDescription = '', releaseLabel = '', effectiveStartDate, latestFromTxServer } = req.body
  let program: fhir4.Library | undefined
  try {
    program = (await FhirClient.getInstance().read({
      resourceType: 'Library',
      id: programId as string
    })) as fhir4.Library
  } catch (e) {
    logSimpleError(e)
  }
  if (program == null) {
    return res.status(500).send({ error: 'Error encountered fetching Library for release' })
  }

  program = setReleaseDescription(program, releaseDescription.trim())
  program = setReleaseLabel(program, releaseLabel.trim())
  // if effectiveStartDate is set, add it
  if (typeof effectiveStartDate === 'string') {
    program = setEffectivePeriodStart(program, effectiveStartDate)
  }

  if (!getReleaseLabel(program) || !getReleaseDescription(program)) {
    return res.status(400).send({ error: 'Release must have label and description set' })
  }

  try {
    await FhirClient.getInstance().update({
      resourceType: 'Library',
      id: program.id,
      body: program
    })
  } catch (e) {
    logSimpleError(e)
    return res.status(500).send({ error: 'Error encountered updating Library for release' })
  }

  if (!!releaseAsVersion) {
    program.version = releaseAsVersion
  }

  const releasePayload = addTerminologyEndpointToParameters({
    resourceType: 'Parameters',
    parameter: [
      {
        name: 'version',
        valueString: removeDraftFromVersionString(program?.version!)
      },
      {
        name: 'versionBehavior',
        valueCode: 'force'
      },
      {
        name: 'latestFromTxServer',
        valueBoolean: latestFromTxServer
      }
    ]
  })

  await FhirClient.getInstance().operation({
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
