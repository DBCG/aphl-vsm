import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import FhirClient from '@/backend/clients/FhirCdrClient'
import Logger from '@/helpers/server/logger'
import { is } from '@/helpers/is'

/**
 * Withdraw a VSP (draft → deleted)
 * VSPs use direct deletion, not $withdraw operation
 */
const withdrawVSP = async (
  req: NextApiRequest,
  res: NextApiResponse<{ message: string } | { error: string }>
): Promise<void> => {
  try {
    const vspId = req.query.id as string

    // Read the current VSP
    const vsp = (await FhirClient.getInstance().read({
      resourceType: 'Library',
      id: vspId
    })) as fhir4.Library

    // Validate it's actually a VSP
    if (!is.isVSP(vsp)) {
      return res.status(400).json({ error: 'Resource is not a Value Set Package' })
    }

    // Check status - can only withdraw drafts
    if (vsp.status !== 'draft') {
      return res.status(400).json({ error: `Cannot withdraw VSP with status '${vsp.status}'. Only draft VSPs can be withdrawn.` })
    }

    // Delete the VSP
    await FhirClient.getInstance().delete({
      resourceType: 'Library',
      id: vspId
    })

    Logger.getLogger().info(`VSP ${vspId} withdrawn (deleted)`)
    res.status(200).send({ message: `VSP ${vspId} withdrawn successfully` })
  } catch (error: any) {
    Logger.getLogger().error('Error withdrawing VSP:', error)
    const diagnostics = error?.response?.data?.issue?.[0]?.diagnostics
    return res.status(500).json({ error: diagnostics || error?.message || 'Failed to withdraw VSP' })
  }
}

export default handler({
  POST: {
    action: withdrawVSP,
    access: ['admin', 'editor']
  }
})
