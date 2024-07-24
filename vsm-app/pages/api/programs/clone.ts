import type { NextApiRequest, NextApiResponse } from 'next'
import { getLatestFromList } from '@/helpers/server/semverHelpers'
import handler from '@/helpers/server/handler'
import logger from '@/helpers/server/logger'
import { fhirCdrClient } from '@/fhirClients'
import { logSimpleError } from '@/helpers/server/simpleHapiError'
import { incrementSemver } from '@/utils'
import { HapiError } from '@/types/hapiError'
import { is } from '@/helpers/is'

interface ResponseItem {
  status: string
  location: string
  etag: string
  lastModified: string
}

type DraftCreateResponse = fhir4.Bundle & { type: 'transaction-response' } & { entry: ResponseItem[] } | fhir4.OperationOutcome | { error: { message: string; type: string } }
export type DraftAPIResponse = { message: string } | { error: string } | fhir4.OperationOutcome
// this code ingests a FHIR Library, and will POST a modified clone as a template
const cloneProgram = async (req: NextApiRequest, res: NextApiResponse<DraftAPIResponse>) => {
  // create library template
  const latestProgram = await fhirCdrClient.search({
    resourceType: 'Library',
    searchParams: {
      url: 'http://ersd.aimsplatform.org/fhir/Library/SpecificationLibrary',
      // currently sorting by newest lastUpdated field because the CQF sort
      // doesn't handle semver automatically
      _sort: ['-_lastUpdated'],
      _count: 1
    }
  })

  const { programId, latestProgramVersion } = req.body

  if (!latestProgramVersion || !programId) {
    return res.status(400).json({ error: 'Missing required parameters' })
  }

  const latestSemverFromCdr = latestProgram?.entry?.[0]?.resource?.version
  const latestSemver = getLatestFromList([latestProgramVersion, latestSemverFromCdr])

  const latestIncrementedVersion = incrementSemver({
    valueToIncrement: latestSemver,
    incrementType: 'minor',
    fallbackValue: '1.0.0'
  })

  let versionToAttempt = latestIncrementedVersion

  // side effect to increment the above fn
  const incrementVersionToAttempt = () => {
    versionToAttempt = incrementSemver({
      valueToIncrement: versionToAttempt,
      incrementType: 'minor',
      fallbackValue: '1.0.0'
    })
  }

  // try to increment versions totalAttempts times before failing out
  // in case there are 422 (already exist collisions)
  const totalAttempts = 30
  let attempts = totalAttempts

  const createDraftWithNewVersion = async (): Promise<DraftCreateResponse | undefined> => {
    let response: DraftCreateResponse | undefined

    logger.info(`attempt #${totalAttempts - (attempts - 1)} out of ${totalAttempts} for $draft. Trying version ${versionToAttempt}`)

    try {
      const parameters = {
        resourceType: 'Parameters',
        parameter: [
          {
            name: 'version',
            valueString: versionToAttempt
          }
        ]
      } as fhir4.Parameters

      const clientResponse = await fhirCdrClient.operation({
        name: '$draft',
        method: 'POST',
        id: `Library/${programId}`,
        options: {
          headers: {
            'content-type': 'application/json'
          }
        },
        input: JSON.stringify(parameters)
      }) as fhir4.Bundle & { type: 'transaction-response' } & { entry: ResponseItem[] }
      if (!clientResponse?.entry?.length && attempts > 0) {
        logger.error(`
          Error: could not $draft Library/${programId} with version ${versionToAttempt}.
          Attempt #${attempts}/5.
        `)
        attempts = attempts - 1
        incrementVersionToAttempt()
        return await createDraftWithNewVersion()
      } else {
        // response is only set in this case
        response = clientResponse
      }
    } catch (e: HapiError | any) {
      if (is.operationOutcome(e?.response?.data)) {
        // always log operation outcomes
        logSimpleError(e)
        if (attempts > 0) {
          // if there are still attempts left, start the loop again + w/increment minor version
          incrementVersionToAttempt()
          attempts = attempts - 1
          return await createDraftWithNewVersion()
        } else {
          return e.response.data
        }
      } else if ('message' in e && 'type' in e) {
        response = { error: { message: e.message, type: e.type } }
      } else {
        response = e.response
      }
    }
    // if all attempts are unsuccessful, this will be undefined
    return response
  }

  const draftResponse = await createDraftWithNewVersion() // either null or a response
  if (is.operationOutcome(draftResponse)) {
    throw draftResponse
  } else if (!!draftResponse && ('error' in draftResponse)) {
    throw ({ error: draftResponse.error.message })
  } else if (!!draftResponse && !('entry' in draftResponse)) {
    throw ({ error: 'Error occurred cloning library' })
  } else {
    return res.status(200).json({ message: 'Successfully drafted' })
  }
}

export default handler({
  POST: {
    action: cloneProgram,
    access: ['admin', 'editor']
  }
})
