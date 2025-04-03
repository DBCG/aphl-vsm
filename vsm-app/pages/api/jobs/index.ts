import { VSMSession } from '@/helpers/rolesHelper'
import handler from '@/helpers/server/handler'
import { isEmpty } from 'lodash'
import type { NextApiRequest, NextApiResponse } from 'next'
import Cache from '@/cache'
import PackageQueue from '@/worker/PackageQueue'
import { Jobs, JobData } from '@/types/jobTypes'
import ChangeLogQueue from '@/worker/ChangeLogQueue'

const getAllJobs = async (req: NextApiRequest, res: NextApiResponse, session: VSMSession) => {
  const cache = await Cache.getInstance()
  const userId = session.user.id

   let jobIds = req?.body as string[] || []
  if (isEmpty(jobIds)) {
    jobIds = await cache.smembers(`user:${userId}:jobs`)
  }

  const multiRun = cache.multi()
  jobIds.forEach((jobId) => {
    multiRun.hgetall(`user:${userId}:job:${jobId}`)
  })

  const results = (await multiRun.exec()) || []
  const idMap = {} as Jobs

  // Invert and create a map of jobIds to jobDetails
  results.forEach((result) => {
    const jobDetail = (result?.[1] || {}) as unknown as JobData
    if (jobDetail != null && jobDetail?.jobId != null) {
      idMap[jobDetail?.jobId] = jobDetail
    }
  })

  res.status(200).json(idMap)
}

const deleteAllJobs = async (req: NextApiRequest, res: NextApiResponse, session: VSMSession) => {
  const cache = await Cache.getInstance()
  const userId = session.user.id
  const jobIds = await cache.smembers(`user:${userId}:jobs`)
  // TODO: Maybe can optimize this to include job type
  const multiRun = cache.multi()
  jobIds.forEach((jobId) => {
    multiRun.del(`user:${userId}:job:${jobId}`)
  })

  await Promise.all(jobIds.map((jobId) => PackageQueue.getJob(jobId).then((job) => job?.remove())))
  await Promise.all(jobIds.map((jobId) => ChangeLogQueue.getJob(jobId).then((job) => job?.remove())))

  await multiRun.exec()
  await cache.del(`user:${userId}:jobs`)
  res.status(200).end()
}

export default handler({
  GET: { action: getAllJobs },
  POST: { action: getAllJobs },
  DELETE: { action: deleteAllJobs }
})
