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
    console.log('body: ', body)

    const grouperLibBundle = await fhirCdrClient.search({
      resourceType: 'ValueSet',
      searchParams: {
        ['context-type']: 'program'
      }
    })

    const grouperValueSet = grouperLibBundle?.entry?.map(i => i?.resource)

    for (const grouper of grouperValueSet) {
      console.log('grouper: ', grouper.compose.include.valueSet)
      const valueSetGroup = grouper.compose.include.valueSet
    }


    const valuesetId = body?.canonical?.split('/ValueSet/')?.[1]
    // need to identify by version, too... can do w/ read?
    const valueSetToUpdate = await fhirCdrClient.read({ resourceType: 'ValueSet', id: valuesetId }) as fhir4.ValueSet

    const updatedValueSet = updateConditions(valueSetToUpdate, body.conditionInfo)

    const updated = await fhirCdrClient.update({
      resourceType: 'ValueSet',
      id: valuesetId,
      body: updatedValueSet
    })

    console.log('updated: ', updated)

    res.status(200).send(updated)
  }
}

// the canonical should only exist 