import { updateLeafVsVersion } from '@/helpers/valueSetHelpers'
import { fhirCdrClient } from 'fhirClients'
import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'

// this endpoint needs to:
// update the grouper valueset canonicals to point to the right valueset version
// add + remove versions from canonicals
const updateLeafValueSetVersions = async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<any> => {
  const body = await req.body
  const bodyJson = JSON.parse(body)
  const { vsCanonical, vsVersion, grouperIds } = bodyJson
  const groupersToUpdate = await Promise.all(grouperIds.map((id: string) => (
    fhirCdrClient.read({
      resourceType: 'ValueSet',
      id,
    })
  )))

  const updatedGroupers = groupersToUpdate?.map(
    (grouperVs: fhir4.ValueSet) => updateLeafVsVersion(grouperVs, vsCanonical, vsVersion)
  )

  await Promise.all(updatedGroupers.map((grouperVs: fhir4.ValueSet) => (
    fhirCdrClient.update({
      resourceType: 'ValueSet',
      id: grouperVs.id,
      body: grouperVs
    })
  )))

  res.status(200).json({ message: 'Update valueset versions completed', grouperIds, vsCanonical })
}

export default handler({
  PUT: {
    action: updateLeafValueSetVersions
  }
})
