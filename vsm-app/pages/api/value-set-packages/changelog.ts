import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import VSPDiffQueue from '@/worker/VSPDiffQueue'
import { VSMSession } from '@/helpers/rolesHelper'
import Logger from '@/helpers/server/logger'
import cache from '@/cache'
import { JOB_TYPE } from '@/constants'
import FhirClient from '@/backend/clients/FhirCdrClient'
import { CompareJobMetadata } from '@/types/jobTypes'

const shouldReprocess = async (
  baseVSP: fhir4.Library,
  targetVSP: fhir4.Library,
  baseVSPLastUpdated: string,
  targetVSPLastUpdated: string
) => {
  // Checks to if last updated date is different
  return baseVSP.meta?.lastUpdated !== baseVSPLastUpdated || targetVSP.meta?.lastUpdated !== targetVSPLastUpdated
}

// Endpoint to generate changelog job for VSPs
const generateChangelog = async (req: NextApiRequest, res: NextApiResponse, session: VSMSession): Promise<any> => {
  try {
    const { baseProgramId, targetProgramId, forceRerun } = req.body

    Logger.getLogger().info(`Received changelog request - baseProgramId: ${baseProgramId}, targetProgramId: ${targetProgramId}, forceRerun: ${forceRerun}`)
    Logger.getLogger().info(`Request body: ${JSON.stringify(req.body)}`)

    if (!baseProgramId?.trim() || !targetProgramId?.trim()) {
      Logger.getLogger().error(`Missing required fields - baseProgramId: ${baseProgramId}, targetProgramId: ${targetProgramId}`)
      return res.status(400).send({ error: 'Must have both base and target VSP IDs for changelog' })
    }
    if (baseProgramId?.trim() === targetProgramId?.trim()) {
      return res.status(400).send({ error: 'Base and Target VSPs must not be the same' })
    }
    const userId = session.user.id

    const changeLogJobs = await cache.getJobs(userId).then((jobs) => jobs?.filter((job: any) => job.type === JOB_TYPE.CHANGE_LOG))

    const baseVSP = (await FhirClient.getInstance().read({ resourceType: 'Library', id: baseProgramId })) as fhir4.Library
    const targetVSP = (await FhirClient.getInstance().read({ resourceType: 'Library', id: targetProgramId })) as fhir4.Library

    let needsNewJob = true

    for (const cachedJob of changeLogJobs) {
      const metadata = JSON.parse(cachedJob.metadata)
      // Matching job found in cache
      if (metadata.baseProgramId === baseProgramId && metadata.targetProgramId === targetProgramId) {
        // Check if job still exists in queue
        const queueJob = await VSPDiffQueue.getJob(cachedJob.jobId)

        if (!queueJob) {
          // Job was cleaned from queue, remove from cache and create new one
          Logger.getLogger().info('Cached job not found in queue, will create new job')
          const cacheInstance = await cache.getInstance()
          await cacheInstance.del(`user:${userId}:job:${cachedJob.jobId}`)
          await cacheInstance.srem(`user:${userId}:jobs`, cachedJob.jobId)
          break
        }

        // If forceRerun is true, remove existing job and create new one
        if (forceRerun) {
          Logger.getLogger().info('Force rerun requested, removing existing job')
          const cacheInstance = await cache.getInstance()
          await cacheInstance.del(`user:${userId}:job:${cachedJob.jobId}`)
          await cacheInstance.srem(`user:${userId}:jobs`, cachedJob.jobId)
          await queueJob.remove()
          break
        }

        // Check if job needs reprocessing due to VSP updates
        if (await shouldReprocess(baseVSP, targetVSP, metadata.baseProgramLastUpdated, metadata.targetProgramLastUpdated)) {
          Logger.getLogger().debug('VSP diff job needs to be reprocessed')
          await queueJob.remove()
          break
        } else {
          // Job is valid and exists, return it
          Logger.getLogger().info('VSP diff job already exists and is valid, returning it')
          needsNewJob = false
          return res.status(200).json(queueJob)
        }
      }
    }

    if (!needsNewJob) {
      return // Already returned the existing job above
    }

    const metadata = {
      baseProgramId,
      targetProgramId,
      baseProgramLastUpdated: baseVSP.meta?.lastUpdated,
      targetProgramLastUpdated: targetVSP.meta?.lastUpdated
    } as CompareJobMetadata

    // No matching job found, create a new job
    Logger.getLogger().debug(`Creating new VSP diff job with baseVSPId: ${baseProgramId} and targetVSPId: ${targetProgramId}`)
    const job = await VSPDiffQueue.add({
      baseVSPId: baseProgramId,
      targetVSPId: targetProgramId,
      userId,
      metadata
    })
    return res.status(200).send(job)
  } catch (e: any) {
    Logger.getLogger().error(e?.response?.data?.issue || e)
    return res.status(400).send({ error: 'Error generating ChangeLog data' })
  }
}

export default handler({
  POST: {
    action: generateChangelog,
    access: ['admin', 'editor', 'reviewer']
  }
})
