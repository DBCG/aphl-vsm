import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import ChangeLogQueue from '@/worker/ChangeLogQueue'
import { VSMSession } from '@/helpers/rolesHelper'
import Logger from '@/helpers/server/logger'
import cache from '@/cache'
import { JOB_TYPE } from '@/constants'
import FhirClient from '@/backend/clients/FhirClient'
import { CompareJobMetadata } from '@/types/jobTypes'

const shouldReprocess = async (
  baseProgram: fhir4.Library,
  targetProgram: fhir4.Library,
  baseProgramLastUpdated: string,
  targetProgramLastUpdated: string
) => {
  // Checks to if last updated date is different
  return baseProgram.meta?.lastUpdated !== baseProgramLastUpdated || targetProgram.meta?.lastUpdated !== targetProgramLastUpdated
}

// Endpoint to generate changelog job
const generateChangelog = async (req: NextApiRequest, res: NextApiResponse, session: VSMSession): Promise<any> => {
  try {
    const { baseProgramId, targetProgramId } = req.body

    if (!baseProgramId?.trim() || !targetProgramId?.trim()) {
      return res.status(400).send({ error: 'Must have both base and target program IDs for changelog' })
    }
    if (baseProgramId?.trim() === targetProgramId?.trim()) {
      return res.status(400).send({ error: 'Base and Target programs must not be the same' })
    }
    const userId = session.user.id

    const changeLogJobs = await cache.getJobs(userId).then((jobs) => jobs?.filter((job: any) => job.type === JOB_TYPE.CHANGE_LOG))

    const baseProgram = (await FhirClient.getInstance().read({ resourceType: 'Library', id: baseProgramId })) as fhir4.Library
    const targetProgram = (await FhirClient.getInstance().read({ resourceType: 'Library', id: targetProgramId })) as fhir4.Library
    for (const job of changeLogJobs) {
      const metadata = JSON.parse(job.metadata)
      // Matching job found
      if (metadata.baseProgramId === baseProgramId && metadata.targetProgramId === targetProgramId) {
        if (await shouldReprocess(baseProgram, targetProgram, metadata.baseProgramLastUpdated, metadata.targetProgramLastUpdated)) {
          Logger.getLogger().debug('ChangeLog job needs to be reprocessed')
          await ChangeLogQueue.getJob(job.jobId).then((job) => job?.remove())
          break
        } else {
          Logger.getLogger().info('Does not need to reprocess, changeLog job already exists,  sending results')
          const finishedJob = await ChangeLogQueue.getJob(job.jobId)
          return res.status(200).json(finishedJob)
        }
      }
    }

    const metadata = {
      baseProgramId,
      targetProgramId,
      baseProgramLastUpdated: baseProgram.meta?.lastUpdated,
      targetProgramLastUpdated: targetProgram.meta?.lastUpdated
    } as CompareJobMetadata

    // No matching job found, create a new job
    Logger.getLogger().debug(`Creating new ChangeLog job with baseProgramId: ${baseProgramId} and targetProgramId: ${targetProgramId}`)
    const job = await ChangeLogQueue.add({ baseProgramId, targetProgramId, userId, metadata })
    return res.status(200).send(job)
  } catch (e: any) {
    Logger.getLogger().error(e?.response?.data?.issue || e)
    return res.status(400).send({ error: 'Error generating ChangeLog data' })
  }
}

export default handler({
  POST: {
    action: generateChangelog
  }
})
