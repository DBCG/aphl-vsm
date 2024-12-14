import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import worker from '@/worker/ValueSetUpdateQueue'
import { Job } from 'bull'
import Logger from '@/helpers/server/logger'
import { VSMSession } from '@/helpers/rolesHelper'
export type UpdateValueSetsResponse = Job<{ urls: string[] }> | { error: any }

const updateBulkValueSets = async (req: NextApiRequest, res: NextApiResponse<UpdateValueSetsResponse>, session: VSMSession) => {
  /*
    Takes in an array of ValueSet URLs from a single Program. Perhaps even the Program (Library) itself?
      * Looks like there is an array of ValueSets in /pages/programs/[id]/valuesets/index.tsx
        Use progValueSetDets.data to know which ValueSets to update
  */
  Logger.getLogger().info('Begin ValueSets Update Job')
  try {
    const { urls = [], programId } = req.body
    if (programId == null) {
      Logger.getLogger().error('programId is required')
      res.status(400).send({ error: 'programId is required' })
    }
    const { user: {id: userId} } = session
    const job = await worker.add({ urls, programId, userId })
    Logger.getLogger().info('UpdateValueSets job added', { job })

    res.json(job)
  } catch (error) {
    res.status(500).send({ error })
  }
}

const getJobStatus = async (req: NextApiRequest, res: NextApiResponse<Job<{ urls: string[] }> | { error: any } | null>): Promise<void> => {
  try {
    const jobId = req.query.jobId as string
    if (!jobId) {
      res.status(404)
    }
    const job = await worker.getJob(jobId)
    res.json(job)
  } catch (error: any) {
    res.status(500).send({ error })
  }
}

export default handler({
  GET: { action: getJobStatus },
  PUT: { action: updateBulkValueSets, roles: ['admin'] }
})
