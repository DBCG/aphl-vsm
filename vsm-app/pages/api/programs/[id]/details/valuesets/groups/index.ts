// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from 'fhirClients'
import { addValueSetToGrouper, removeValueSetFromGrouper } from '@/helpers/valueSetHelpers'
import handler from '@/helpers/server/handler'
import { grouperValueSetBase } from '@/helpers/grouperValuesetBase'

interface GroupInfoItem {
  label: string,
  value: string
}

// POST a grouper that has never existed before
const addGrouperValueSet = async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<any> => {
  const body = JSON.parse(req.body)

  const {
    title, name, status,
    publisher, version,
    purpose, description
  } = body

  let fieldsToAdd = {
    title, name, status, publisher,
    version, purpose, description
  }

  // maybe use a deep copy in case the valueset has deeply nested fields?
  const newGrouper = Object.assign(
    grouperValueSetBase,
    fieldsToAdd
  )

  try {
    const newVs = await fhirCdrClient.create({
      resourceType: 'ValueSet',
      body: newGrouper
    })

    res.status(200).send(newVs)
    return
  } catch (e) {
    console.error('Saving grouper valueset failed')
  }
  res.status(400).send({ error: 'failed to save grouper vs' })
}

const retrieveGroupSets = async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<any> => {
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
}

const updateGroupSets = async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<any> => {
  const body = JSON.parse(req.body)
  const { groupInfo } = body
  const leafValuesetId = body?.canonical?.split('/ValueSet/')?.[1]

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
    const groupersToUpdate = []

    for (const grouperValueSet of grouperVSets) {
      const leafVSetsInGroup = grouperValueSet?.compose?.include?.map((item: any) => item?.valueSet)
        ?.filter((x: string | undefined) => x)
        .flat()

      const leafExistsInGrouper = leafVSetsInGroup?.find((canonical: string) => canonical?.endsWith(leafValuesetId))

      const leafShouldExistInGrouper = groupInfo?.find((i: GroupInfoItem) => i?.value === grouperValueSet?.id)

      if (!leafExistsInGrouper && leafShouldExistInGrouper) {
        // add the grouper
        groupersToUpdate.push(addValueSetToGrouper(grouperValueSet, [body.canonical]))
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
    return res.status(200).send(result)
  }
}

export default handler({
  GET: { action: retrieveGroupSets },
  PUT: { action: updateGroupSets, access: ['admin', 'editor'] },
  POST: { action: addGrouperValueSet, access: ['admin', 'editor'] }
})