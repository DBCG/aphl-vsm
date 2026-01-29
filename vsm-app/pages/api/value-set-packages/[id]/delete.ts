import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import FhirClient from '@/backend/clients/FhirCdrClient'
import Logger from '@/helpers/server/logger'
import { is } from '@/helpers/is'

/**
 * Delete a VSP (retired → deleted)
 * Only retired VSPs can be permanently deleted
 */
const deleteVSP = async (
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

    // Check status - can only delete retired VSPs
    if (vsp.status !== 'retired') {
      return res.status(400).json({ error: `Cannot delete VSP with status '${vsp.status}'. Only retired VSPs can be deleted.` })
    }

    // Delete the VSP
    await FhirClient.getInstance().delete({
      resourceType: 'Library',
      id: vspId
    })

    Logger.getLogger().info(`VSP ${vspId} deleted`)
    res.status(200).send({ message: `VSP ${vspId} deleted successfully` })
  } catch (error: any) {
    Logger.getLogger().error('Error deleting VSP:', error)
    const diagnostics = error?.response?.data?.issue?.[0]?.diagnostics
    return res.status(500).json({ error: diagnostics || error?.message || 'Failed to delete VSP' })
  }
}

export default handler({
  POST: {
    action: deleteVSP,
    access: ['admin']
  }
})
