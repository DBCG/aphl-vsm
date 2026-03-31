import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import Logger from '@/helpers/server/logger'
import VSPDiffQueue from '@/worker/VSPDiffQueue'
import PackageQueue from '@/worker/PackageQueue'
import VSPPackageQueue from '@/worker/VSPPackageQueue'
import ChangeLogQueue from '@/worker/ChangeLogQueue'
import DependencyQueue from '@/worker/DependencyQueue'
import VSPReleaseQueue from '@/worker/VSPReleaseQueue'
import ProgramReleaseQueue from '@/worker/ProgramReleaseQueue'
import Cache from '@/cache'
import { JOB_TYPE } from '@/constants'
import { VSMSession } from '@/helpers/rolesHelper'

/**
 * Get the result/return value of a completed job
 */
const getJobResult = async (req: NextApiRequest, res: NextApiResponse, session: VSMSession) => {
  try {
    const jobId = req.query.id as string

    if (!jobId) {
      return res.status(400).json({ error: 'Job ID is required' })
    }

    Logger.getLogger().info(`Fetching result for job: ${jobId}`)

    const userId = session.user.id

    // Get job type from cache
    const cache = await Cache.getInstance()
    const cacheKey = `user:${userId}:job:${jobId}`
    const jobType = await cache.hget(cacheKey, 'type')

    Logger.getLogger().info(`Cache key: ${cacheKey}`)
    Logger.getLogger().info(`Job type from cache: ${jobType}`)

    if (!jobType) {
      Logger.getLogger().warn(`Job type not found in cache for key: ${cacheKey}`)
      return res.status(404).json({ error: 'Job not found in cache' })
    }

    Logger.getLogger().info(`Job type: ${jobType}`)

    // Get the job from the appropriate queue
    let job
    switch (jobType) {
      case JOB_TYPE.CHANGE_LOG:
        // Try both changelog queues
        Logger.getLogger().info(`Checking VSPDiffQueue for job ${jobId}`)
        job = await VSPDiffQueue.getJob(jobId)
        if (!job) {
          Logger.getLogger().info(`Not in VSPDiffQueue, checking ChangeLogQueue`)
          job = await ChangeLogQueue.getJob(jobId)
        }
        Logger.getLogger().info(`Job found in queue: ${!!job}`)
        break
      case JOB_TYPE.EXPORT:
        // Try both export queues
        Logger.getLogger().info(`Checking VSPPackageQueue for job ${jobId}`)
        job = await VSPPackageQueue.getJob(jobId)
        if (!job) {
          Logger.getLogger().info(`Not in VSPPackageQueue, checking PackageQueue`)
          job = await PackageQueue.getJob(jobId)
        }
        Logger.getLogger().info(`Job found in queue: ${!!job}`)
        break
      case JOB_TYPE.RELEASE:
        Logger.getLogger().info(`Checking VSPReleaseQueue for job ${jobId}`)
        job = await VSPReleaseQueue.getJob(jobId)
        if (!job) {
          Logger.getLogger().info(`Not in VSPReleaseQueue, checking ProgramReleaseQueue`)
          job = await ProgramReleaseQueue.getJob(jobId)
        }
        Logger.getLogger().info(`Job found in queue: ${!!job}`)
        break
      case JOB_TYPE.FETCH_DEPENDENCIES:
        Logger.getLogger().info(`Checking DependencyQueue for job ${jobId}`)
        job = await DependencyQueue.getJob(jobId)
        Logger.getLogger().info(`Job found in queue: ${!!job}`)
        break
      default:
        return res.status(400).json({ error: `Unsupported job type: ${jobType}` })
    }

    if (!job) {
      Logger.getLogger().warn(`Job ${jobId} not found in any queue for type ${jobType}`)
      return res.status(404).json({ error: 'Job not found in queue' })
    }

    // Get the job state and result
    const state = await job.getState()
    const returnvalue = job.returnvalue
    const failedReason = job.failedReason

    Logger.getLogger().info(`Job state: ${state}`)
    Logger.getLogger().info(`Has return value: ${!!returnvalue}`)

    // If job failed, include the failure reason
    if (state === 'failed' && failedReason) {
      Logger.getLogger().error(`Job ${jobId} failed: ${failedReason}`)
      return res.status(200).json({
        jobId,
        state,
        error: failedReason,
        finishedOn: job.finishedOn,
        processedOn: job.processedOn
      })
    }

    return res.status(200).json({
      jobId,
      state,
      returnvalue,
      finishedOn: job.finishedOn,
      processedOn: job.processedOn
    })
  } catch (error: any) {
    Logger.getLogger().error('Error fetching job result:', error)
    return res.status(500).json({ error: error.message })
  }
}

export default handler({
  GET: { access: ['admin', 'publisher', 'editor', 'reviewer'], action: getJobResult }
})
