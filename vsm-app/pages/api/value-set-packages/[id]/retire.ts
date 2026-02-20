import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import FhirClient from '@/backend/clients/FhirCdrClient'
import Logger from '@/helpers/server/logger'
import { is } from '@/helpers/is'

/**
 * Retire a VSP (active → retired)
 * VSPs use direct status updates, not $retire operation
 */
const retireVSP = async (
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

    // Check status - can only retire active VSPs
    if (vsp.status !== 'active') {
      return res.status(400).json({ error: `Cannot retire VSP with status '${vsp.status}'. Only active VSPs can be retired.` })
    }

    // Update status to retired
    vsp.status = 'retired'

    // Update the VSP
    await FhirClient.getInstance().update({
      resourceType: 'Library',
      id: vspId,
      body: vsp
    })

    Logger.getLogger().info(`VSP ${vspId} retired (active → retired)`)
    res.status(200).send({ message: `VSP ${vspId} retired successfully` })
  } catch (error: any) {
    Logger.getLogger().error('Error retiring VSP:', error)
    const diagnostics = error?.response?.data?.issue?.[0]?.diagnostics
    return res.status(500).json({ error: diagnostics || error?.message || 'Failed to retire VSP' })
  }
}

export default handler({
  POST: {
    action: retireVSP,
    access: ['admin', 'editor']
  }
})
