import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from 'fhirClients'
import { ConditionToUpdate, updateConditions } from '@/helpers/conditionHelpers'
import handler from '@/helpers/server/handler'
import logger from '@/helpers/server/logger'
export type conditionUpdateReturn = fhir4.ValueSet | { error: string }
const handleConditionUpdate = async (req: NextApiRequest, res: NextApiResponse<conditionUpdateReturn>) => {
  const body = req.body as ConditionToUpdate
  // need to identify by version, too... can do w/ read?
  // ISSUE to be fixed by cache... thihs isn't immediately available
  const valueSetToUpdate = await fhirCdrClient.search({
    resourceType: 'ValueSet',
    searchParams: {
      url: body?.canonical,
      version: body?.version
    }
  }) as fhir4.Bundle

  const vs = valueSetToUpdate?.entry?.[0]?.resource as fhir4.ValueSet

  const updatedValueSet = updateConditions(vs, body.conditionInfo || [])

  let updated
  try {
    updated = await fhirCdrClient.update({
      resourceType: 'ValueSet',
      searchParams: {
        url: body?.canonical,
        version: body.version
      },
      body: updatedValueSet
    }) as fhir4.ValueSet
    res.status(200).send(updated)
  } catch (e) {
    logger.error('error: ', e)
    res.status(400).send({ error: 'error' })
  }
}

export default handler({
  PUT: { action: handleConditionUpdate, access: ['admin', 'editor'] }
})
