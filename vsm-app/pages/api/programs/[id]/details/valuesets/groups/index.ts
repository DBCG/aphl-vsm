import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from 'fhirClients'
import { addValueSetToGrouper, removeValueSetFromGrouper } from '@/helpers/valueSetHelpers'
import handler from '@/helpers/server/handler'
import logger from '@/helpers/server/logger'
import getLibraryAndGrouper from '@/helpers/server/getProgramAndGrouper'

interface GroupInfoItem {
  label: string
  value: string
}
export type retrieveGrouperSetsReturn = fhir4.ValueSet[] | { error: string }
const retrieveGroupSets = async (req: NextApiRequest, res: NextApiResponse<retrieveGrouperSetsReturn>): Promise<void> => {
  try {
      const { grouperVSets } = await getLibraryAndGrouper(req.query.id as string)
      return res.status(200).send(grouperVSets)
  } catch (e) {
    logger.error(e)
    res.status(400).send({ error: 'get groupers failed' })
  }
}

const updateGroupSets = async (req: NextApiRequest, res: NextApiResponse): Promise<any> => {
  const body = req.body
  const { groupInfo } = body

  const programLibrary = await fhirCdrClient.read({ resourceType: 'Library', id: req.query.id as string })

  const grouperLibraryCanonical = programLibrary?.relatedArtifact?.find(
    (art: any) => art?.type === 'composed-of' && art?.resource?.includes('/Library/')
  )?.resource

  const [grouperLibUrl, grouperLibVersion] = grouperLibraryCanonical.split('|')

  const grouperLibrarySearchBundle = await fhirCdrClient.search({
    resourceType: 'Library',
    searchParams: {
      url: grouperLibUrl,
      version: grouperLibVersion
    }
  })

  const library: fhir4.Library = grouperLibrarySearchBundle?.entry?.[0]?.resource

  const grouperValueSetCanonicals = library?.relatedArtifact
    ?.filter((art) => art.type === 'composed-of' && art?.resource?.includes('/ValueSet/'))
    ?.map((item) => item?.resource) as string[]

  if (grouperValueSetCanonicals?.length) {
    const grouperValueSetSearchSets = await Promise.all(
      grouperValueSetCanonicals?.map((canonical: string) => {
        const [url, version] = canonical.split('|')
        return fhirCdrClient.search({
          resourceType: 'ValueSet',
          searchParams: {
            url: url,
            version: version
          }
        })
      })
    )

    const grouperVSets = grouperValueSetSearchSets?.map((bundle) => bundle?.entry?.[0]?.resource)
    const groupersToUpdate = []

    // this is not currently handling versions right
    for (const grouperValueSet of grouperVSets) {
      const leafVSetsInGroup = grouperValueSet?.compose?.include
        ?.map((item: any) => item?.valueSet)
        ?.filter((x: string | undefined) => x)
        .flat()

      // TODO: this is not specific enough, could match other things
      const leafExistsInGrouper = leafVSetsInGroup?.find((canonicalWithPossibleVersion: string) => {
        const [canonicalInGrouper, versionInGrouper] = canonicalWithPossibleVersion.split('|')
        const canonicalInLeaf = canonicalWithPossibleVersion.split('|')[0]
        const versionInLeaf = body.version
        return (canonicalInGrouper === canonicalInLeaf) && (versionInGrouper === versionInLeaf)
      })

      const wrongLeafVersionInGrouper = leafVSetsInGroup?.find((canonicalWithPossibleVersion: string) => {
        const [canonicalInGrouper, versionInGrouper] = canonicalWithPossibleVersion.split('|')
        const canonicalInLeaf = canonicalWithPossibleVersion.split('|')[0]
        const versionInLeaf = body.version
        return (canonicalInGrouper === canonicalInLeaf) && (versionInGrouper !== versionInLeaf)
      })

      const leafShouldExistInGrouper = groupInfo?.find((i: GroupInfoItem) => (
        i?.value === grouperValueSet?.id
      ))

      if (!leafExistsInGrouper && leafShouldExistInGrouper) {
        let currentGrouper = grouperValueSet
        // if the wrong leaf version exists in the grouper already
        if (wrongLeafVersionInGrouper) {
          currentGrouper = removeValueSetFromGrouper(grouperValueSet, [body.canonical])
        }
        // add the grouper
        groupersToUpdate.push(addValueSetToGrouper(currentGrouper, body.canonical))
      } else if (leafExistsInGrouper && !leafShouldExistInGrouper) {
        const grouperWithVsRemoved = removeValueSetFromGrouper(grouperValueSet, [body.canonical])
        if (grouperWithVsRemoved) {
          // remove from grouper
          groupersToUpdate.push(grouperWithVsRemoved)
        } else {
          return res.status(400).send({ error: `Could not remove Valueset "${grouperValueSet.title}" from groupers` })
        }
      }
    }

    const result = await Promise.all(
      groupersToUpdate.map((grouperVs) =>
        fhirCdrClient.update({
          resourceType: 'ValueSet',
          id: grouperVs.id,
          body: grouperVs
        })
      )
    )
    return res.status(200).send(result)
  }
}

export default handler({
  GET: { action: retrieveGroupSets },
  PUT: { action: updateGroupSets, access: ['admin', 'editor'] }
})
