import FhirClient from '@/backend/clients/FhirClient'
import handler from '@/helpers/server/handler'
import Logger from '@/helpers/server/logger'
import type { NextApiRequest, NextApiResponse } from 'next'

const bulkUpdate = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const payload = req.body
    
    const batchPrepVs = payload?.valueSets.map((vs: fhir4.ValueSet) => ({
      resource: vs,
      request: {
        method: 'PUT',
        url: `/ValueSet/${vs.id}`
      }
    }))

    const response = await FhirClient.getInstance().batch({body: {
      resourceType: 'Bundle',
      type: 'batch',
      entry: batchPrepVs
    }})
    const errors = response.entry.find((i: any) => !i.response?.status.includes('200'))
    if (errors) {
      throw new Error(`Error updating ValueSets: ${JSON.stringify(errors)}`)
    }
    res.status(200).json({ success: true })
  } catch (e) {
    Logger.getLogger().error(e)
    res.status(400).json({ error: 'Updating ValueSet failed' })
  }
}

export default handler({
  PUT: { action: bulkUpdate, access: ['admin', 'editor'] }
})