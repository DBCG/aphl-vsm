import type { NextApiRequest, NextApiResponse } from 'next'
import Cache from '@/cache'
import handler from '@/helpers/server/handler'
import { ReleasePayload } from '@/components/modals/ReleaseModal'
import { VSMSession } from '@/helpers/rolesHelper'
import ProgramReleaseQueue from '@/worker/ProgramReleaseQueue'
import { JOB_TYPE } from '@/constants'
import { DEFAULT_JOB_CONFIG } from '@/config'

export interface ReleaseRequest extends NextApiRequest {
  body: ReleasePayload
}

// this only gets the program library
const release = async (req: ReleaseRequest, res: NextApiResponse, session: VSMSession): Promise<any> => {
  const { releaseAsVersion, programId, releaseDescription = '', programTitle, releaseLabel = '', effectiveStartDate, latestFromTxServer } = req.body
  const userId = session.user.id
  const job = await ProgramReleaseQueue.add(
    {
      releaseAsVersion,
      programId,
      releaseDescription,
      releaseLabel,
      effectiveStartDate,
      latestFromTxServer,
      userId
    },
    DEFAULT_JOB_CONFIG
  )

  await Cache.setNewJob({
    userId,
    jobId: job.id.toString(),
    type: JOB_TYPE.RELEASE,
    metadata: JSON.stringify({
      programId,
      programTitle,
      latestFromTxServer
    })
  })

  return res.status(200).send(job)
}

export default handler({
  POST: {
    action: release,
    access: ['admin', 'editor']
  }
})
