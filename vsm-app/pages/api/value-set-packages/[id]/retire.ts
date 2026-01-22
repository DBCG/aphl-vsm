import type { NextApiRequest, NextApiResponse } from 'next'
import FhirClient from '@/backend/clients/FhirCdrClient'
import handler from '@/helpers/server/handler'
import Logger from '@/helpers/server/logger'
import { logSimpleError } from '@/helpers/server/simpleHapiError'
import { is } from '@/helpers/is'

/**
 * Retire an active VSP by changing its status to 'retired'
 * Only active VSPs can be retired
 */
const retire = async (req: NextApiRequest, res: NextApiResponse): Promise<any> => {
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

    // Only active VSPs can be retired
    if (vsp.status !== 'active') {
      return res.status(400).json({ error: 'Only active VSPs can be retired' })
    }

    // Update status to retired
    vsp.status = 'retired'

    // Update in FHIR CDR
    const result = await FhirClient.getInstance().update({
      resourceType: 'Library',
      id: vspId,
      body: vsp
    })

    Logger.getLogger().info(`Retired VSP: ${vspId}`)
    return res.status(200).json({
      message: 'Value Set Package retired successfully',
      vsp: result
    })
  } catch (error: any) {
    Logger.getLogger().error('Error retiring VSP:', error)
    logSimpleError(error)
    return res.status(500).json({ error: error.message || 'Failed to retire Value Set Package' })
  }
}

export default handler({
  POST: { access: ['admin', 'editor'], action: retire }
})
