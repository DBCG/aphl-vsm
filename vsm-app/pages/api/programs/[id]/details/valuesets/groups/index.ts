// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from 'fhirClients'
import { addValueSetToGrouper, removeValueSetFromGrouper } from '@/helpers/valueSetHelpers'


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<any> {
  if (req.method === 'PUT') {
    const body = JSON.parse(req.body)
    const { groupInfo } = body
    const leafValuesetId = body?.canonical?.split('/ValueSet/')?.[1]

    const valueSetBundle = await fhirCdrClient.search({
      resourceType: 'ValueSet',
      searchParams: {
        ['context-type']: 'program'
      }
    }) as fhir4.Bundle

    try {
      const grouperValueSets = valueSetBundle?.entry?.map(i => i?.resource)?.filter(x => x?.resourceType === 'ValueSet') as fhir4.ValueSet[]
      let groupersToUpdate = []

      for (const grouperValueSet of grouperValueSets) {
        const leafVSetsInGroup = grouperValueSet?.compose?.include?.[0]?.valueSet
        const leafExistsInGrouper = leafVSetsInGroup?.find(canonical => {
          return canonical?.endsWith(leafValuesetId)
        })
        const leafShouldExistInGrouper = groupInfo?.find(i => i?.value === grouperValueSet?.id)

        if (!leafExistsInGrouper && leafShouldExistInGrouper) {
          // add the grouper
          groupersToUpdate.push(addValueSetToGrouper(grouperValueSet, body.canonical))
        } else if (leafExistsInGrouper && !leafShouldExistInGrouper) {
          // remove from grouper
          groupersToUpdate.push(removeValueSetFromGrouper(grouperValueSet, body.canonical))
        }
      }

      const result = await Promise.all(groupersToUpdate.map(grouperVs => (
        fhirCdrClient.update({
          resourceType: 'ValueSet',
          id: grouperVs.id,
          body: grouperVs
        })
      )))

      res.status(200).send(result)
      return
    } catch (e) {
      console.error('error: ', e)
    }
  }

  res.status(404).send({ error: 'update grouper valuesets did not complete' })
}