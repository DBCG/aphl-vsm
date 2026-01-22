import type { NextApiRequest, NextApiResponse } from 'next'
import FhirClient from '@/backend/clients/FhirCdrClient'
import { is } from '@/helpers/is'
import handler from '@/helpers/server/handler'
import { HapiError } from '@/types/hapiError'
import Logger from '@/helpers/server/logger'
import { logSimpleError } from '@/helpers/server/simpleHapiError'
import { validateVSPVersion } from '@/helpers/vspHelpers'

// Retrieve a single VSP by ID
const retrieveVSP = async (req: NextApiRequest, res: NextApiResponse) => {
  if (is.string(req?.query?.id)) {
    try {
      const vsp = (await FhirClient.getInstance().read({
        resourceType: 'Library',
        id: req.query.id as string
      })) as fhir4.Library

      // Verify this is actually a VSP
      if (!is.isVSP(vsp)) {
        Logger.getLogger().error(`Resource ${req.query.id} is not a VSP`)
        return res.status(400).json({ error: 'Resource is not a Value Set Package' })
      }

      return res.status(200).send({ vsp })
    } catch (e: any) {
      const error = e as HapiError
      Logger.getLogger().error(`ERROR: ${error.response?.data?.issue?.[0]?.code}, ${error.response?.data?.issue?.[0]?.diagnostics}`)
      return res.status(error.response?.status || 400).json({ error: 'Failed to retrieve Value Set Package' })
    }
  } else {
    Logger.getLogger().error('error: Invalid VSP ID')
    return res.status(400).json({ error: 'Invalid Value Set Package ID' })
  }
}

// Update VSP metadata (draft only)
const updateVSP = async (req: NextApiRequest, res: NextApiResponse<fhir4.Library | fhir4.Resource | { error: string }>) => {
  try {
    const { id, status, experimental, version } = req.body

    // Validate status - cannot edit active or retired VSPs
    if (status === 'active') {
      Logger.getLogger().error('Cannot edit an active Value Set Package')
      return res.status(409).send({ error: 'Cannot edit active Value Set Package. Only draft VSPs can be edited.' })
    }

    if (status === 'retired') {
      Logger.getLogger().error('Cannot edit a retired Value Set Package')
      return res.status(409).send({ error: 'Cannot edit retired Value Set Package.' })
    }

    // Validate VSP version format if version is being updated
    if (version && !validateVSPVersion(version)) {
      return res.status(400).json({ error: 'Invalid vspVersion format. Must be YYYY-MM (e.g., "2026-01")' })
    }

    // Validate experimental flag against IG
    // If IG is experimental, VSP cannot be non-experimental
    const igExperimental = req.query['igExperimental']?.toString() === 'true'
    if (igExperimental && experimental === false) {
      return res.status(400).json({
        error: 'VSP cannot be experimental=false when IG is experimental=true'
      })
    }

    // Verify ID matches
    if (id === req.query['id']?.toString()) {
      const response = await FhirClient.getInstance().update({
        resourceType: 'Library',
        id: id as string,
        body: req.body
      })

      return res.status(200).send(response)
    } else {
      return res.status(400).json({ error: 'ID mismatch in update request' })
    }

  } catch (e: any) {
    const error = e as HapiError
    logSimpleError(error)
    return res.status(error?.response?.status || 500).json({ error: `Error updating Value Set Package` })
  }
}

export default handler({
  GET: { action: retrieveVSP },
  PUT: { action: updateVSP, access: ['admin', 'editor'] },
})
