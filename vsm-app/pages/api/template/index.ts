import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import logger from '@/helpers/server/logger'
import { fhirCdrClient } from '@/fhirClients'
import { logSimpleHapiError } from '@/helpers/server/simpleHapiError'
import { incrementSemver } from '@/utils'
import { HapiError } from '@/types/hapiError'
import { is } from '@/helpers/is'

interface ResponseItem {
  status: string
  location: string
  etag: string
  lastModified: string
}

type DraftCreateResponse = fhir4.Bundle & { type: 'transaction-response' } & { entry: ResponseItem[] } | fhir4.OperationOutcome | null

// this code ingests a FHIR Library, and will POST a modified clone as a template
const setDraft = async (req: NextApiRequest, res: NextApiResponse) => {
  // create library template
  try {
    let body = JSON.parse(req.body)

    let previousVersion = body.version

    // try to increment versions totalAttempts times before failing out
    // in case there are 422 (already exist collisions)
    const totalAttempts = 30
    let attempts = totalAttempts

    const createDraftWithNewVersion = async (): Promise<DraftCreateResponse> => {

      let response

      const newVersion = incrementSemver({
        valueToIncrement: previousVersion,
        incrementType: 'minor',
        fallbackValue: '1.0.0'
      })

      logger.info(`attempt #${totalAttempts - (attempts - 1)} out of ${totalAttempts} for $draft. Trying version ${newVersion}`)

      try {
        // update previousVersion in case you need to run again
        previousVersion = newVersion

        const parameters = {
          resourceType: 'Parameters',
          parameter: [
            {
              name: 'version',
              valueString: newVersion
            }
          ]
        } as fhir4.Parameters

        const clientResponse = await fhirCdrClient.operation({
          name: '$draft',
          method: 'POST',
          id: `Library/${body.id}`,
          options: {
            headers: {
              'content-type': 'application/json'
            }
          },
          input: JSON.stringify(parameters)
        })

        if (!clientResponse?.entry?.length && attempts > 0) {
          logger.error(`Error: could not $draft Library/${body.id} with version ${newVersion}. Attempt #${attempts}/5.`)
          attempts = attempts - 1
          await createDraftWithNewVersion()
        } else {
          response = clientResponse
        }
      } catch (e: HapiError | any) {
        if (e?.response?.status === 422 && attempts > 0) {
          attempts = attempts - 1
          return await createDraftWithNewVersion()
        } else {
          logSimpleHapiError(e)
          return null
        }
      }
      // final return of response if nothing catches
      return response
    }

    const draftResponse = await createDraftWithNewVersion() // either null or a response

    if (!is.operationOutcome(draftResponse) && draftResponse?.entry?.length) {
      return res.status(200).json({ message: 'Successfully drafted' })
    } else {
      return res.status(400).json({ message: 'Failed to clone Library.' })
    }
  } catch (e) {
    logSimpleHapiError(e)
    return res.status(400).json({ message: 'Creation of new Library failed here.' })
  }

}

export default handler({
  POST: {
    action: setDraft,
    access: ['admin', 'editor']
  }
})
