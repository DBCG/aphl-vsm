import { is } from '@/helpers/is'
import { getTerminologySource, updateLeafVsVersion } from '@/helpers/valueSetHelpers'
import { fhirCdrClient, terminologyClient } from 'fhirClients'
import type { NextApiRequest, NextApiResponse } from 'next'

// this endpoint needs to:
// update the grouper valueset canonicals to point to the right valueset version
// add + remove versions from canonicals
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<any> {
  if (req.method === 'PUT') {
    const body = await req.body
    const bodyJson = JSON.parse(body)
    console.log('bodyJson: ', bodyJson)
    const { vsCanonical, vsVersion, grouperIds } = bodyJson
    console.log('vsCanonical: ', vsCanonical)
    console.log('vsVersion: ', vsVersion)
    console.log('grouperIds: ', grouperIds)
    const groupersToUpdate = await Promise.all(grouperIds.map((id: string) => (
      fhirCdrClient.read({
        resourceType: 'ValueSet',
        id,
      })
    )))

    console.log('groupersToUpdate: ', groupersToUpdate[0]?.compose?.include)
    const updatedGroupers = groupersToUpdate?.map((grouperVs: fhir4.ValueSet) => updateLeafVsVersion(grouperVs, vsCanonical, vsVersion))
    console.log('updated: ', updatedGroupers)
    console.log('updated: ', updatedGroupers[0]?.compose?.include)
    // return
    const resultFromUpdate = await Promise.all(updatedGroupers.map((grouperVs: fhir4.ValueSet) => (
      fhirCdrClient.update({
        resourceType: 'ValueSet',
        id: grouperVs.id,
        body: grouperVs
      })
    )))

    console.log('result from update: ', resultFromUpdate[0].compose.include)
    res.status(200).json({ message: 'Update valueset versions completed', grouperIds, vsCanonical })


  } else {
    console.error(`Method '${req.method} not supported.'`)
    res.status(405).json({ error: 'Method not allowed.' })
  }
}
