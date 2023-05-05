import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import { generateErrorMessage } from '@/helpers/server/generateErrorMessage'
import logger from '@/helpers/server/logger'
import { fhirCdrClient } from '@/fhirClients'
import { logSimpleHapiError } from '@/helpers/server/simpleHapiError'
import { incrementSemver } from '@/utils'

// this code ingests a FHIR Library, and will POST a modified clone as a template
const setDraft = async (req: NextApiRequest, res: NextApiResponse) => {
  // create library template
  try {
    let body = JSON.parse(req.body)

    let previousVersion = body.version

    // try to increment versions 5 times before failing out
    // in case there are duplicates
    const totalAttempts = 30
    let attempts = totalAttempts

    const createDraftWithNewVersion = async () => {
      let response

      const newVersion = incrementSemver({
        valueToIncrement: previousVersion,
        incrementType: 'minor',
        fallbackValue: '1.0.0'
      })

      try {

        // update previousVersion in case you need to run again
        previousVersion = newVersion

        const parameter = [
          {
            name: 'version',
            valueString: newVersion
          }
        ]

        const parameters = {
          resourceType: 'Parameters',
          parameter
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

        if (clientResponse?.entry?.length) {
          return clientResponse
        }

        if (!clientResponse?.entry?.length && attempts > 0) {

          logger.error(`Error: could not $draft Library/${body.id} with version ${newVersion}. Attempt #${attempts}/5.`)
          // console.log('response 1: ', response);
          attempts--
          await createDraftWithNewVersion()
        } else {
          response = clientResponse
        }
        console.log('response here should be same as response 1: ', response)
        return response
      } catch (e) {
        console.log('hit this catch 2: ', e)
        if (e?.response?.status === 422 && attempts > 0) {
          console.log(`422 with version ${newVersion}}, try again`);
          await createDraftWithNewVersion()
        } else {
          // console.error('error at last: ', e)
          logSimpleHapiError(e)
          console.log('returning null from catch')
          return null
        }
      }
      return response
    }

    const draftResponse = await createDraftWithNewVersion()

    console.log('response here: ', draftResponse)

    if (draftResponse?.entry?.length) {
      return res.status(200).json({ message: 'Successfully drafted' })
    } else {
      return res.status(400).json({ message: 'Failed to clone Library.' })
    }
  } catch (e) {
    // console.log('hit that error catch: ', e);

    logSimpleHapiError(e)
    return res.status(400).json({ message: 'Creation of new Library failed here 2.' })
  }

}

export default handler({
  POST: {
    action: setDraft,
    access: ['admin', 'editor']
  }
})
