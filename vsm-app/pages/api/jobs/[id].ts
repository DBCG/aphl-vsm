import handler from '@/helpers/server/handler'
import type { NextApiRequest, NextApiResponse } from 'next'
import PackageQueue from '@/worker/PackageQueue'

const getJobStatus = async (req: NextApiRequest, res: NextApiResponse) => {
  const jobId = req.query.id as string
  if (!jobId) {
    return res.status(400).json({ error: 'Job ID is required' })
  }

  // TODO: Only retrieves PackageQueue Job at this time
  const job = await PackageQueue.getJob(jobId)
  res.status(200).json(job)
}

export default handler({
  GET: { action: getJobStatus }
})
