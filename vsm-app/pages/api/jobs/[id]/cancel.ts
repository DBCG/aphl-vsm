import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import Logger from '@/helpers/server/logger'
import { VSMSession } from '@/helpers/rolesHelper'
import DependencyQueue from '@/worker/DependencyQueue'
import PackageQueue from '@/worker/PackageQueue'
import VSPPackageQueue from '@/worker/VSPPackageQueue'
import ProgramReleaseQueue from '@/worker/ProgramReleaseQueue'
import VSPReleaseQueue from '@/worker/VSPReleaseQueue'
import ChangeLogQueue from '@/worker/ChangeLogQueue'
import VSPDiffQueue from '@/worker/VSPDiffQueue'
import Cache from '@/cache'
import { JOB_STATUS, JOB_TYPE } from '@/constants'

interface CancelJobResponse {
  success: boolean
  message?: string
  error?: string
}

/**
 * Cancel a job in progress
 * This will:
 * 1. Remove the job from the Bull queue
 * 2. Update the cache status to FAILED
 * 3. Return success/error response
 */
const cancelJob = async (req: NextApiRequest, res: NextApiResponse<CancelJobResponse>, session: VSMSession) => {
  try {
    const userId = session.user.id
    const jobId = req.query.id as string

    if (!jobId) {
      return res.status(400).json({ success: false, error: 'Job ID is required' })
    }

    Logger.getLogger().info(`Cancelling job: ${jobId}`)

    // Get job metadata from cache to determine queue type
    const cache = await Cache.getInstance()
    const cacheKey = `user:${userId}:job:${jobId}`
    const jobType = await cache.hget(cacheKey, 'type')

    if (!jobType) {
      Logger.getLogger().warn(`No job type found for job ${jobId}`)
      return res.status(404).json({ success: false, error: 'Job not found' })
    }

    // Determine which queue to use based on job type
    let queue
    let job

    switch (jobType) {
      case JOB_TYPE.FETCH_DEPENDENCIES:
        queue = DependencyQueue
        job = await queue.getJob(jobId)
        break
      case JOB_TYPE.EXPORT:
        // For exports, try both queues since both Program and VSP exports use EXPORT type
        // Try VSP queue first
        job = await VSPPackageQueue.getJob(jobId)
        if (job) {
          queue = VSPPackageQueue
        } else {
          // Fallback to Program package queue
          job = await PackageQueue.getJob(jobId)
          queue = PackageQueue
        }
        break
      case JOB_TYPE.RELEASE:
        queue = VSPReleaseQueue
        job = await queue.getJob(jobId)
        if (!job) {
          queue = ProgramReleaseQueue
          job = await queue.getJob(jobId)
        }
        break
      case JOB_TYPE.CHANGE_LOG:
        // For changelog jobs, try both queues (Programs use ChangeLogQueue, VSPs use VSPDiffQueue)
        job = await ChangeLogQueue.getJob(jobId)
        if (job) {
          queue = ChangeLogQueue
        } else {
          job = await VSPDiffQueue.getJob(jobId)
          queue = VSPDiffQueue
        }
        break
      default:
        return res.status(400).json({ success: false, error: `Unknown job type: ${jobType}` })
    }

    if (!job) {
      Logger.getLogger().warn(`Job ${jobId} not found in any queue`)
      // Still update cache to mark as cancelled
      await cache.hset(cacheKey, 'status', JOB_STATUS.FAILED, 'error', 'Job cancelled by user')
      return res.status(200).json({ success: true, message: 'Job not found in queue but marked as cancelled' })
    }

    // Check if job is already completed or failed
    const state = await job.getState()
    if (state === 'completed' || state === 'failed') {
      Logger.getLogger().info(`Job ${jobId} is already ${state}`)
      return res.status(200).json({ success: true, message: `Job already ${state}` })
    }

    // Remove the job from the queue (this cancels it)
    await job.remove()
    Logger.getLogger().info(`Job ${jobId} removed from queue`)

    // Update cache to reflect cancellation
    await cache.hset(cacheKey, 'status', JOB_STATUS.FAILED, 'error', 'Job cancelled by user')

    return res.status(200).json({ success: true, message: 'Job cancelled successfully' })
  } catch (error: any) {
    Logger.getLogger().error('Error cancelling job:', error)
    return res.status(500).json({ success: false, error: error.message })
  }
}

export default handler({
  POST: { access: ['admin', 'publisher', 'editor', 'reviewer'], action: cancelJob }
})
