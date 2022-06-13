// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from 'fhirClients'
import { updateConditions } from '@/helpers/conditionHelpers'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<any> {
  if (req.method === 'PUT') {
    const body = JSON.parse(req.body)
    const valuesetId = body?.canonical?.split('/ValueSet/')?.[1]
    // need to identify by version, too... can do w/ read?
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
          url: body.url,
          version: body.version
        },
        body: updatedValueSet
      })
      res.status(200).send(updated)
    } catch (e) {
      console.error('error in .det.val.cond: ', e)
      res.status(400).send({ error: 'error'})
    }
  }
}