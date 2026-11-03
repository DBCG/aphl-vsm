import handler from '@/helpers/server/handler'
import type { NextApiRequest, NextApiResponse } from 'next'
import Cache from '@/cache'
import { VSMSession } from '@/helpers/rolesHelper'
import PackageQueue from '@/worker/PackageQueue'
import DependencyQueue from '@/worker/DependencyQueue'
import VSPPackageQueue from '@/worker/VSPPackageQueue'
import VSPReleaseQueue from '@/worker/VSPReleaseQueue'
import ChangeLogQueue from '@/worker/ChangeLogQueue'
import VSPDiffQueue from '@/worker/VSPDiffQueue'
import ProgramReleaseQueue from '@/worker/ProgramReleaseQueue'

const getJobStatus = async (req: NextApiRequest, res: NextApiResponse) => {
  const jobId = req.query.id as string
  if (!jobId) {
    return res.status(400).json({ error: 'Job ID is required' })
  }

  // Try to find job in PackageQueue first
  let job = await PackageQueue.getJob(jobId)

  // If not found, try DependencyQueue
  if (!job) {
    job = await DependencyQueue.getJob(jobId)
  }

  // If still not found, try VSPPackageQueue
  if (!job) {
    job = await VSPPackageQueue.getJob(jobId)
  }

  // If still not found, try VSPReleaseQueue
  if (!job) {
    job = await VSPReleaseQueue.getJob(jobId)
  }

  if (!job) {
    return res.status(404).json({ error: 'Job not found' })
  }

  res.status(200).json(job)
}

// Remove a single job: deletes its cache entry, drops it from the user's job set,
// and removes the underlying Bull job from whichever queue holds it. Mirrors the
// per-queue cleanup done by the "Clear all" endpoint (DELETE /api/jobs).
const deleteJob = async (req: NextApiRequest, res: NextApiResponse, session: VSMSession) => {
  const jobId = req.query.id as string
  if (!jobId) {
    return res.status(400).json({ error: 'Job ID is required' })
  }

  const cache = await Cache.getInstance()
  const userId = session.user.id

  // Ownership check: Bull job ids are small per-queue integers and easy to guess, so we must
  // confirm the job belongs to this user before removing it from any queue — otherwise one
  // user could delete another user's in-flight job. A job is the user's only if it is in their
  // job set. (The cache del/srem below are already user-scoped and no-op for other users.)
  const isOwned = await cache.sismember(`user:${userId}:jobs`, jobId)
  if (!isOwned) {
    return res.status(404).json({ error: 'Job not found' })
  }

  await cache.del(`user:${userId}:job:${jobId}`)
  await cache.srem(`user:${userId}:jobs`, jobId)

  const queues = [
    PackageQueue,
    VSPPackageQueue,
    ChangeLogQueue,
    VSPDiffQueue,
    ProgramReleaseQueue,
    VSPReleaseQueue,
    DependencyQueue
  ]
  await Promise.all(
    queues.map((queue) =>
      queue
        .getJob(jobId)
        .then((job) => job?.remove())
        .catch(() => undefined)
    )
  )

  res.status(200).end()
}

export default handler({
  GET: { action: getJobStatus },
  DELETE: { action: deleteJob }
})
