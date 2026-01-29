import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import Logger from '@/helpers/server/logger'
import DependencyQueue from '@/worker/DependencyQueue'
import ExportQueue from '@/worker/ExportQueue'
import ReleaseQueue from '@/worker/ReleaseQueue'
import ComparisonQueue from '@/worker/ComparisonQueue'
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
const cancelJob = async (req: NextApiRequest, res: NextApiResponse<CancelJobResponse>, userId: string) => {
  try {
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
    switch (jobType) {
      case JOB_TYPE.FETCH_DEPENDENCIES:
        queue = DependencyQueue
        break
      case JOB_TYPE.EXPORT:
        queue = ExportQueue
        break
      case JOB_TYPE.RELEASE:
        queue = ReleaseQueue
        break
      case JOB_TYPE.CHANGE_LOG:
        queue = ComparisonQueue
        break
      default:
        return res.status(400).json({ success: false, error: `Unknown job type: ${jobType}` })
    }

    // Get the job from the queue
    const job = await queue.getJob(jobId)

    if (!job) {
      Logger.getLogger().warn(`Job ${jobId} not found in queue`)
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
  POST: { access: ['admin', 'editor', 'reviewer'], handler: cancelJob }
})
