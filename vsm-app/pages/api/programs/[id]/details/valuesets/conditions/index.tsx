// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from 'fhirClients'
import { updateConditions } from '@/helpers/conditionHelpers'
import handler from '@/helpers/server/handler'

const handleConditionUpdate = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {

  const body = JSON.parse(req.body)
  // need to identify by version, too... can do w/ read?
  // ISSUE to be fixed by cache... thihs isn't immediately available
  const valueSetToUpdate = await fhirCdrClient.search({
    resourceType: 'ValueSet',
    searchParams: {
      url: body?.canonical,
      version: body?.version
    }
  })

  const vs = valueSetToUpdate?.entry?.[0]?.resource

  const updatedValueSet = updateConditions(vs, body.conditionInfo)

  let updated
  try {
    updated = await fhirCdrClient.update({
      resourceType: 'ValueSet',
      searchParams: {
        url: body?.canonical,
        version: body.version
      },
      body: updatedValueSet
    })
    res.status(200).send(updated)
  } catch (e) {
    console.error('error: ', e)
    res.status(400).send({ error: 'error'})
  }
}

export default handler({
  PUT: { action: handleConditionUpdate, access: ['admin', 'editor']}
})