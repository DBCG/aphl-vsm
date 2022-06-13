// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient, vsacFhirClient } from 'fhirClients'
import { updateConditions } from '@/helpers/conditionHelpers'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<any> {
  // get ValueSets by id
  if (req.method === 'GET') {
    try {
      const response = await vsacFhirClient.search({ resourceType: 'ValueSet' })

      res.status(200).send(response)
    } catch (e) {
      console.error('error:  ', e)
      res.status(400).json({ error: 'Loading ValueSets failed' })
    }
  } if (req.method === 'PUT') {
    const body = await req.body
    const bodyJson = JSON.parse(body)
    console.log('body: ', bodyJson)

    console.log('conditions: ', bodyJson.selectedConditions[0]);
    let vSetsToUpdate = []
    let vsToUpdate

    const existingVSets = await Promise.all(bodyJson?.selectedValueSets?.map(item => (
      fhirCdrClient.search({
        resourceType: 'ValueSet',
        searchParams: {
          url: item.url,
          version: item.version
        }
      })
    )
    ))

    console.log('existing: ', existingVSets)

    const filteredVSets = existingVSets
      ?.filter(x => x)
      ?.map(item => item?.entry?.[0]?.resource)

    for (const selectedVS of bodyJson.selectedValueSets) {
      const matchingValueSetInCQF = filteredVSets?.find(vs => vs?.url === selectedVS?.url && vs?.version === selectedVS?.version)
      if (matchingValueSetInCQF) {
        console.log('match found')
        console.log('match useContext: ', matchingValueSetInCQF.useContext)
        vsToUpdate = matchingValueSetInCQF
        vSetsToUpdate.push({ method: 'PUT', valueSet: matchingValueSetInCQF })
      } else {
        try {
          const matchingVSetsFromRemoteServer = await vsacFhirClient.search({
            resourceType: 'ValueSet',
            searchParams: {
              url: selectedVS.url,
              // commenting out version here because they don't match in test data
              // version: selectedVS.version
            }
          })

          const matchingVSFromRemote = matchingVSetsFromRemoteServer?.entry?.[0]?.resource
          if (matchingVSFromRemote) {
            matchingVSFromRemote.url = matchingVSetsFromRemoteServer?.entry?.[0]?.fullUrl
            vSetsToUpdate.push({ method: 'POST', valueSet: matchingVSFromRemote })
          } else {
            console.error('no match found')
          }

        } catch (e) {
          console.error('error: ', e)
        }
      }
    }

    // handle if no vsets to update, too
    // add conditions to valueSet
    const updatedValueSetItems = vSetsToUpdate?.map(vs => {
      const updatedVs = updateConditions(vs.valueSet, bodyJson.selectedConditions, false)
      console.log('updatedVs.usecontext: ', updatedVs.useContext)
      return ({
        valueSet: updatedVs,
        method: vs.method
      })
    })

    try {
      const performedUpdate = await Promise.all(updatedValueSetItems.map(async (item) => {
        if (item.method === 'PUT') {
          await fhirCdrClient.update({
            resourceType: 'ValueSet',
            id: item.valueSet.id,
            body: item.valueSet
          })
        } else {
          await fhirCdrClient.create({
            resourceType: 'ValueSet',
            body: item.valueSet
          })
        }
      }))

      console.log('updated: ', performedUpdate)

    } catch (e) {
      console.error(e)
    }

    // get groupers
    const groupersToUpdate = await Promise.all(bodyJson.selectedGroupers.map(async (grouperItem) => {
      return await fhirCdrClient.read({
        resourceType: 'ValueSet',
        id: grouperItem.id
      })
    }))

    try {
      // this assumes grouper already has a compose/include block, will need to be updated
      // when we allow users to create groupers
      const performGrouperUpdate = await Promise.all(groupersToUpdate.map(async (grouperVs) => {
        const originalComposeInclude = grouperVs.compose.include[0].valueSet
        const newValueSetCanonicals = bodyJson.selectedValueSets.map(item => item.url)
        // deduplicate with set
        const newComposeInclude = Array.from(new Set([...originalComposeInclude, ...newValueSetCanonicals]))

        grouperVs.compose.include[0].valueSet = newComposeInclude

        return await fhirCdrClient.update({
          resourceType: 'ValueSet',
          id: grouperVs.id,
          body: grouperVs
        })
      }))
    } catch (e) {
      console.error(e)
    }

    res.send(200)
  }
}
