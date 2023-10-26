import { fhirCdrClient } from '@/fhirClients'
import handler from '@/helpers/server/handler'
import logger from '@/helpers/server/logger'
import type { NextApiRequest, NextApiResponse } from 'next'

const updateSingleVs = async (req: NextApiRequest, res: NextApiResponse) => {
  const vsId = req.query.id as string
  try {
    const valueSet = JSON.parse(req.body) as fhir4.ValueSet
    const response = await fhirCdrClient.update({ resourceType: 'ValueSet', id: vsId, body: valueSet })
    res.status(200).send(response)
  } catch (e) {
    logger.error(e)
    res.status(400).json({ error: 'Updating ValueSet failed' })
  }
}

export default handler({
  PUT: { action: updateSingleVs, access: ['admin', 'editor'] }
})