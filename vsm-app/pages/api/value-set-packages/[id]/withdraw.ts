import type { NextApiRequest, NextApiResponse } from 'next'
import FhirClient from '@/backend/clients/FhirCdrClient'
import handler from '@/helpers/server/handler'
import Logger from '@/helpers/server/logger'
import { logSimpleError } from '@/helpers/server/simpleHapiError'
import { is } from '@/helpers/is'

/**
 * Withdraw (delete) a draft VSP
 * Only draft VSPs can be withdrawn
 */
const withdraw = async (req: NextApiRequest, res: NextApiResponse): Promise<any> => {
  try {
    const vspId = req.query.id as string

    // Fetch the VSP
    const vsp = (await FhirClient.getInstance().read({
      resourceType: 'Library',
      id: vspId
    })) as fhir4.Library

    // Verify this is actually a VSP
    if (!is.isVSP(vsp)) {
      return res.status(400).json({ error: 'Resource is not a Value Set Package' })
    }

    // Only draft VSPs can be withdrawn
    if (vsp.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft VSPs can be withdrawn' })
    }

    // Delete from FHIR CDR
    await FhirClient.getInstance().delete({
      resourceType: 'Library',
      id: vspId
    })

    Logger.getLogger().info(`Withdrawn (deleted) VSP: ${vspId}`)
    return res.status(200).json({
      message: 'Value Set Package withdrawn and deleted successfully'
    })
  } catch (error: any) {
    Logger.getLogger().error('Error withdrawing VSP:', error)
    logSimpleError(error)
    return res.status(500).json({ error: error.message || 'Failed to withdraw Value Set Package' })
  }
}

export default handler({
  POST: { access: ['admin', 'editor'], action: withdraw }
})
