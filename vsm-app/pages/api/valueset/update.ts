// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import worker from 'worker'
import { Job } from 'bull'
export type UpdateValueSetsResponse = Job<{ urls: string[] }> | { error: any }
const updateBulkValueSets = async (req: NextApiRequest, res: NextApiResponse<UpdateValueSetsResponse>) => {
  /*
    Takes in an array of ValueSet URLs from a single Program. Perhaps even the Program (Library) itself?
      * Looks like there is an array of ValueSets in /pages/programs/[id]/valuesets/index.tsx
        Use progValueSetDets.data to know which ValueSets to update
  */
  try {
    const { urls = [] } = JSON.parse(req.body)
    const job = await worker.add({ urls })

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
  GET: {
    action: getJobStatus
  },
  PUT: {
    action: updateBulkValueSets
  }
})