import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import FhirClient from '@/backend/clients/FhirCdrClient'
import Logger from '@/helpers/server/logger'
import { is } from '@/helpers/is'

/**
 * Release a VSP (draft → active)
 * VSPs use direct status updates, not $release operation
 */
const releaseVSP = async (
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

    // Check status
    if (vsp.status !== 'draft') {
      return res.status(400).json({ error: `Cannot release VSP with status '${vsp.status}'. Only draft VSPs can be released.` })
    }

    // Update status to active
    vsp.status = 'active'

    // Set date to now (release date)
    vsp.date = new Date().toISOString()

    // Update the VSP
    await FhirClient.getInstance().update({
      resourceType: 'Library',
      id: vspId,
      body: vsp
    })

    Logger.getLogger().info(`VSP ${vspId} released (draft → active)`)
    res.status(200).send({ message: `VSP ${vspId} released successfully` })
  } catch (error: any) {
    Logger.getLogger().error('Error releasing VSP:', error)
    const diagnostics = error?.response?.data?.issue?.[0]?.diagnostics
    return res.status(500).json({ error: diagnostics || error?.message || 'Failed to release VSP' })
  }
}

export default handler({
  POST: {
    action: releaseVSP,
    access: ['admin', 'publisher']
  }
})
