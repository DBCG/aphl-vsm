// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from 'fhirClients'
import { addValueSetToGrouper, removeValueSetFromGrouper } from '@/helpers/valueSetHelpers'

interface GroupInfoItem {
  label: string,
  value: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<any> {

  if (req.method === 'GET') {
    let result = []
    // get all grouper valueSets from within a program
    const programLibrary = await fhirCdrClient.read({ resourceType: 'Library', id: req.query.id as string })

    const grouperLibraryCanonical = programLibrary?.relatedArtifact
      ?.find((art: any) => art?.type === 'composed-of' && art?.resource?.includes('/Library/'))
      ?.resource

    const [grouperLibUrl, grouperLibVersion] = grouperLibraryCanonical.split('|')

    const grouperLibrarySearchBundle = await fhirCdrClient.search({
      resourceType: 'Library',
      searchParams: {
        url: grouperLibUrl,
        version: grouperLibVersion
      }
    })

    const library: fhir4.Library = grouperLibrarySearchBundle?.entry?.[0]?.resource

    const grouperValueSetCanonicals = library
      ?.relatedArtifact
      ?.filter((art) => art.type === 'composed-of' && art?.resource?.includes('/ValueSet/'))
      ?.map(item => item?.resource) as string[]

    if (grouperValueSetCanonicals?.length) {
      const grouperValueSetSearchSets = await Promise.all(grouperValueSetCanonicals?.map((canonical: string) => {
        const [url, version] = canonical.split('|')
        return (
          fhirCdrClient.search({
            resourceType: 'ValueSet',
            searchParams: {
              url: url,
              version: version
            }
          })
        )
      }
      ))

      const grouperVSets = grouperValueSetSearchSets?.map(bundle => bundle?.entry?.[0]?.resource)
      result = grouperVSets
      res.status(200).send(result)
      return
    }
    res.status(400).send({ error: 'get groupers failed' })
  } else if (req.method === 'PUT') {
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
        const leafExistsInGrouper = leafVSetsInGroup?.find(canonical => canonical?.endsWith(leafValuesetId))

        const leafShouldExistInGrouper = groupInfo?.find((i: GroupInfoItem) => i?.value === grouperValueSet?.id)

        if (!leafExistsInGrouper && leafShouldExistInGrouper) {
          // add the grouper
          groupersToUpdate.push(addValueSetToGrouper(grouperValueSet, body.canonical))
        } else if (leafExistsInGrouper && !leafShouldExistInGrouper) {
          // remove from grouper
          groupersToUpdate.push(removeValueSetFromGrouper(grouperValueSet, body.canonical))
        }
      }
      //TODO: Think about batching this in the future if its a lot of valuesets and we can create a job to follow through
      const result = await Promise.all(groupersToUpdate.map(grouperVs => (
        fhirCdrClient.update({
          resourceType: 'ValueSet',
          id: grouperVs.id,
          body: grouperVs
        })
      )))

      return res.status(200).send(result)
    } catch (e) {
      console.error('error: ', e)
      return res.status(404).send({ error: 'update grouper valuesets did not complete' })
    }
  }

}