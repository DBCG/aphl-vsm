import handler from '@/helpers/server/handler'
import type { NextApiRequest, NextApiResponse } from 'next'
import PackageQueue from '@/worker/PackageQueue'
import DependencyQueue from '@/worker/DependencyQueue'

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

  if (!job) {
    return res.status(404).json({ error: 'Job not found' })
  }

  res.status(200).json(job)
}

export default handler({
  GET: { action: getJobStatus }
})
