import type { NextApiRequest, NextApiResponse } from 'next'
import Cache from '@/cache'
import handler from '@/helpers/server/handler'
import { ReleasePayload } from '@/components/modals/ReleaseModal'
import { VSMSession } from '@/helpers/rolesHelper'
import ProgramReleaseQueue from '@/worker/ProgramReleaseQueue'
import { JOB_STATUS, JOB_TYPE } from '@/constants'
import FhirClient from '@/backend/clients/FhirCdrClient'
import { DEFAULT_JOB_CONFIG } from '@/config'
import {
  getReleaseDescription,
  getReleaseLabel,
  setEffectivePeriodStart,
  setReleaseDescription,
  setReleaseLabel
} from '@/helpers/libraryHelpers'
import { logSimpleError } from '@/helpers/server/simpleHapiError'
import { cache } from 'react'
import Logger from "@/helpers/server/logger";

export interface ReleaseRequest extends NextApiRequest {
  body: ReleasePayload
}

// this only gets the program library
const release = async (req: ReleaseRequest, res: NextApiResponse, session: VSMSession): Promise<any> => {
  const {
    releaseAsVersion,
    programId,
    releaseDescription = '',
    programTitle,
    releaseLabel = '',
    effectiveStartDate,
    latestFromTxServer
  } = req.body
  const userId = session.user.id

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
    return res.status(404).send({ error: 'Program not found' })
  }

  // TypeScript now knows program is Library, no ! needed
  program = setReleaseDescription(program, releaseDescription.trim())
  program = setReleaseLabel(program, releaseLabel.trim())

  // if effectiveStartDate is set, add it
  if (typeof effectiveStartDate === 'string') {
    program = setEffectivePeriodStart(program, effectiveStartDate)
  }

  if (!getReleaseLabel(program) || !getReleaseDescription(program)) {
    return res.status(400).send({
      error: 'Release label and description are required'
    })
  }

  try {
    await FhirClient.getInstance().update({
      resourceType: 'Library',
      id: program.id,
      body: program
    })
  } catch (e) {
    logSimpleError(e)
    const error = 'Error encountered updating Library for release'
    return res.status(500).send({ error })
  }

  if (!!releaseAsVersion) {
    program.version = releaseAsVersion
  }

  try {
    Logger.getLogger().info('Release Job Config:')
    Logger.getLogger().info(DEFAULT_JOB_CONFIG)

    const job = await ProgramReleaseQueue.add(
        {
          releaseAsVersion,
          programId,
          releaseDescription,
          releaseLabel,
          effectiveStartDate,
          latestFromTxServer,
          userId
        },
        DEFAULT_JOB_CONFIG
    )

    await Cache.setNewJob({
      userId,
      jobId: job.id.toString(),
      type: JOB_TYPE.RELEASE,
      metadata: JSON.stringify({
        programId,
        programTitle,
        latestFromTxServer
      })
    })

    return res.status(200).send(job)
  } catch (e) {
    Logger.getLogger().error(`Error encountered starting release job: ${e}`)
  }
  return res.status(500).send({ error: 'Error encountered starting release job' })
}

export default handler({
  POST: {
    action: release,
    access: ['admin', 'publisher']
  }
})
