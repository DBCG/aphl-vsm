import type { NextApiRequest, NextApiResponse } from 'next'
import FhirClient from '@/backend/clients/FhirCdrClient'
import handler from '@/helpers/server/handler'
import Logger from '@/helpers/server/logger'
import { logSimpleError } from '@/helpers/server/simpleHapiError'
import { is } from '@/helpers/is'

/**
 * Release a draft VSP by changing its status to 'active'
 * VSPs don't have the complex release process that Programs have
 */
const release = async (req: NextApiRequest, res: NextApiResponse): Promise<any> => {
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

    // Only draft VSPs can be released
    if (vsp.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft VSPs can be released' })
    }

    // Update status to active
    vsp.status = 'active'

    // Update in FHIR CDR
    const result = await FhirClient.getInstance().update({
      resourceType: 'Library',
      id: vspId,
      body: vsp
    })

    Logger.getLogger().info(`Released VSP: ${vspId}`)
    return res.status(200).json({
      message: 'Value Set Package released successfully',
      vsp: result
    })
  } catch (error: any) {
    Logger.getLogger().error('Error releasing VSP:', error)
    logSimpleError(error)
    return res.status(500).json({ error: error.message || 'Failed to release Value Set Package' })
  }
}

export default handler({
  POST: { access: ['admin', 'editor'], action: release }
})
