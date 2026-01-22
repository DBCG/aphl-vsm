import type { NextApiRequest, NextApiResponse } from 'next'
import FhirClient from '@/backend/clients/FhirCdrClient'
import handler from '@/helpers/server/handler'
import Logger from '@/helpers/server/logger'
import { logSimpleError } from '@/helpers/server/simpleHapiError'
import { is } from '@/helpers/is'

/**
 * Delete a retired VSP
 * Only retired VSPs can be deleted
 */
const deleteVSP = async (req: NextApiRequest, res: NextApiResponse): Promise<any> => {
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

    // Only retired VSPs can be deleted
    if (vsp.status !== 'retired') {
      return res.status(400).json({ error: 'Only retired VSPs can be deleted' })
    }

    // Delete from FHIR CDR
    await FhirClient.getInstance().delete({
      resourceType: 'Library',
      id: vspId
    })

    Logger.getLogger().info(`Deleted retired VSP: ${vspId}`)
    return res.status(200).json({
      message: 'Value Set Package deleted successfully'
    })
  } catch (error: any) {
    Logger.getLogger().error('Error deleting VSP:', error)
    logSimpleError(error)
    return res.status(500).json({ error: error.message || 'Failed to delete Value Set Package' })
  }
}

export default handler({
  POST: { access: ['admin', 'editor'], action: deleteVSP }
})
