import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import FhirClient from '@/backend/clients/FhirCdrClient'
import Logger from '@/helpers/server/logger'
import { is } from '@/helpers/is'
import VSPReleaseQueue from '@/worker/VSPReleaseQueue'
import { JOB_TYPE } from '@/constants'
import { DEFAULT_JOB_CONFIG } from '@/config'
import Cache from '@/cache'
import { VSMSession } from '@/helpers/rolesHelper'

/**
 * Release a VSP via async $release-manifest operation
 */
const releaseVSP = async (
  req: NextApiRequest,
  res: NextApiResponse,
  session: VSMSession
): Promise<void> => {
  try {
    const vspId = req.query.id as string
    const { latestFromTxServer = false } = req.body || {}
    const userId = session.user.id

    // Read the current VSP
    const vsp = (await FhirClient.getInstance().read({
      resourceType: 'Library',
      id: vspId
    })) as fhir4.Library

    // Validate it's actually a VSP
    if (!is.isVSP(vsp)) {
      return res.status(400).json({ error: 'Resource is not a Value Set Package' })
    }

    // Check status
    if (vsp.status !== 'draft') {
      return res.status(400).json({ error: `Cannot release VSP with status '${vsp.status}'. Only draft VSPs can be released.` })
    }

    // Queue the release job
    const job = await VSPReleaseQueue.add(
      { vspId, latestFromTxServer, userId },
      DEFAULT_JOB_CONFIG
    )

    // Track in cache
    await Cache.setNewJob({
      userId,
      jobId: job.id.toString(),
      type: JOB_TYPE.RELEASE,
      metadata: JSON.stringify({ programId: vspId, programTitle: vsp.title })
    })

    Logger.getLogger().info(`VSP ${vspId} release job queued with ID: ${job.id}`)
    return res.status(200).json(job)
  } catch (error: any) {
    Logger.getLogger().error('Error queuing VSP release:', error)
    const diagnostics = error?.response?.data?.issue?.[0]?.diagnostics
    return res.status(500).json({ error: diagnostics || error?.message || 'Failed to queue VSP release' })
  }
}

export default handler({
  POST: {
    action: releaseVSP,
    access: ['admin', 'publisher']
  }
})
