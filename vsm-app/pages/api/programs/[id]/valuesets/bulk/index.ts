import { fhirCdrClient } from '@/fhirClients'
import { setVSPriority } from '@/helpers/libraryHelpers'
import handler from '@/helpers/server/handler'
import logger from '@/helpers/server/logger'
import { logSimpleError } from '@/helpers/server/simpleHapiError'
import type { NextApiRequest, NextApiResponse } from 'next'
import { NextApiRequestQuery } from 'next/dist/server/api-utils'

interface Query extends NextApiRequestQuery {
  id: string
}

// bulk update for conditions, groupers, and priority
// currently will only handle one update type at a time
const bulkUpdate = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const payload = req.body
    const { leafIds, priority, leafUrls } = payload
    const { id: programId } = req.query as Query

    // priority is set on the base Program Library
    if (priority) {
      let programToUpdate = await fhirCdrClient.read({
        resourceType: 'Library', 
        id: programId
      }) as fhir4.Library

      programToUpdate = setVSPriority(programToUpdate, priority, leafUrls)

      const updated = await fhirCdrClient.update({
        resourceType: 'Library',
        id: programId,
        body: programToUpdate
      })

      if (updated.resourceType === 'Library') {
        return res.status(200).json({ success: true })
      } else {
        logSimpleError('Error attempting priority bulk update')
        return res.status(500).json({ error: 'Priority update failed' })
      }
    } else {
      return res.status(501).json({ error: 'Bulk update not implemented for this item' }) 
    }
  } catch (e) {
    logSimpleError(e)
    res.status(400).json({ error: 'Bulk ValueSet update failed' })
  }
}

export default handler({
  PUT: { action: bulkUpdate, access: ['admin', 'editor'] }
})