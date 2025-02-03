import type { NextApiRequest, NextApiResponse } from 'next'
import FhirClient from '@/backend/clients/FhirClient'
import { addValueSetToGrouper, removeValueSetFromGrouper, updateLeafVsVersion } from '@/helpers/valueSetHelpers'
import handler from '@/helpers/server/handler'
import Logger from '@/helpers/server/logger'
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
    Logger.getLogger().error(e)
    res.status(400).send({ error: 'get groupers failed' })
  }
}

const updateGroupSets = async (req: NextApiRequest, res: NextApiResponse): Promise<any> => {
  const body = req.body
  const { groupInfo } = body

  const { grouperVSets } = await getLibraryAndGrouper(req.query.id as string)

  const groupersToUpdate = []

  // this is not currently handling versions right
  for (const grouperValueSet of grouperVSets) {
    const leafVSetsInGroupFromCQF = grouperValueSet?.compose?.include
      ?.map((item: any) => item?.valueSet)
      ?.filter((x: string | undefined) => x)
      .flat()

    // check if the leaf exists in the grouper at all
    const leafCanonicalExistsInGrouper = leafVSetsInGroupFromCQF?.find((canonicalWithPossibleVersion: string) => {
      const [canonicalInGrouper] = canonicalWithPossibleVersion.split('|')
      const canonicalInLeaf = body.leafCanonical.split('|')[0] // shouldn't have version but just in case
      return canonicalInGrouper === canonicalInLeaf
    })

    // if leaf exists in grouper, check if it has the right version
    const wrongLeafVersionInGrouper = leafCanonicalExistsInGrouper
      ? leafVSetsInGroupFromCQF?.find((canonicalWithPossibleVersion: string) => {
          const [canonicalInGrouper, versionInGrouper] = canonicalWithPossibleVersion.split('|')
          const canonicalInLeaf = body.leafCanonical.split('|')[0]
          const versionInLeaf = body.leafVersion
          return canonicalInGrouper === canonicalInLeaf && versionInGrouper !== versionInLeaf
        })
      : false

    const leafShouldExistInGrouper = groupInfo?.find((i: GroupInfoItem) => i?.value === grouperValueSet?.id)

    const currentLeafCanonicalWithVersion = `${body.leafCanonical}${body.leafVersion ? `|${body.leafVersion}` : ''}`
    // easiest case: need to add a whole new canonical because it's not there
    if (!leafCanonicalExistsInGrouper && leafShouldExistInGrouper) {
      // add the grouper

      groupersToUpdate.push(addValueSetToGrouper(grouperValueSet, currentLeafCanonicalWithVersion))
      // also easy case, if canonical should be absent from grouper, delete it
    } else if (leafCanonicalExistsInGrouper && !leafShouldExistInGrouper) {
      const grouperWithVsRemoved = removeValueSetFromGrouper(grouperValueSet, [body.leafCanonical])
      // TODO why this if statement? maybe because groupers can't have 0 valuesets?
      if (grouperWithVsRemoved) {
        // remove from grouper
        groupersToUpdate.push(grouperWithVsRemoved)
      } else {
        return res.status(400).send({ error: `Could not remove Valueset "${grouperValueSet.title}" from groupers` })
      }
      // if the grouper exists with the wrong version, update that version on the reference
    } else if (leafCanonicalExistsInGrouper && wrongLeafVersionInGrouper) {
      const editedVsVersionGrouper = updateLeafVsVersion(grouperValueSet, body.leafCanonical, body.leafVersion)
      groupersToUpdate.push(editedVsVersionGrouper)
    }
  }

  const result = await Promise.all(
    groupersToUpdate.map((grouperVs) =>
      FhirClient.getInstance().update({
        resourceType: 'ValueSet',
        id: grouperVs.id,
        body: grouperVs
      })
    )
  )
  return res.status(200).send(result)
}

export default handler({
  GET: { action: retrieveGroupSets },
  PUT: { action: updateGroupSets, access: ['admin', 'editor'] }
})
