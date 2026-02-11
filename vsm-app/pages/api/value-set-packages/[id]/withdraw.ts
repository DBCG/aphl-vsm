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

    // Hard delete the VSP (use HAPI's expunge to completely remove it)
    // First, do a soft delete
    await FhirClient.getInstance().delete({
      resourceType: 'Library',
      id: vspId
    })

    // Then expunge (hard delete) the resource
    // HAPI FHIR's $expunge operation permanently removes deleted resources
    try {
      await FhirClient.getInstance().operation({
        name: '$expunge',
        resourceType: 'Library',
        id: vspId,
        method: 'POST',
        input: {
          resourceType: 'Parameters',
          parameter: [
            {
              name: 'expungeDeletedResources',
              valueBoolean: true
            },
            {
              name: 'expungePreviousVersions',
              valueBoolean: true
            }
          ]
        }
      })
      Logger.getLogger().info(`VSP ${vspId} hard deleted (expunged)`)
    } catch (expungeError: any) {
      Logger.getLogger().warn(`VSP ${vspId} soft deleted but expunge failed:`, expungeError?.message)
      Logger.getLogger().info(`VSP ${vspId} withdrawn (soft delete only - recreating with same ID may fail)`)
    }

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
