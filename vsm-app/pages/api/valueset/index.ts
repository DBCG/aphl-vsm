// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient, vsacFhirClient } from 'fhirClients'
import { updateConditions } from '@/helpers/conditionHelpers'
import { getSession } from 'next-auth/react'
import { terminologyClient } from 'fhirClients'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<any> {
  const session = await getSession({ req })
  if (!session) {
    res.status(401).end()
  }

  // get ValueSets by id
  if (req.method === 'GET') {
    try {
      const response = await vsacFhirClient.search({ resourceType: 'ValueSet' })

      res.status(200).send(response)
    } catch (e) {
      console.error(e)
      res.status(400).json({ error: 'Loading ValueSets failed' })
    }
  } if (req.method === 'PUT') {
    const body = await req.body
    const bodyJson = JSON.parse(body)

    let vSetsToUpdate = []
    let vsToUpdate

    // check fhir server first to see if we already have the selected valueSets
    const serverResponses = await Promise.allSettled(bodyJson?.selectedValueSets?.map((item: any) => (
      fhirCdrClient.search({
        resourceType: 'ValueSet',
        searchParams: {
          url: item.url,
          version: item.version
        }
      })
    )
    ))

    const existingVSetBundles = serverResponses
      ?.map(item => item?.status === 'fulfilled' && item?.value)
      ?.filter(x => x) as fhir4.Bundle[]

    const filteredVSets = existingVSetBundles
      ?.filter(x => x)
      ?.map(item => item?.entry?.[0]?.resource) as fhir4.ValueSet[]

    for (const selectedVS of bodyJson.selectedValueSets) {
      const matchingValueSetInCQF = filteredVSets?.find(vs => vs?.url === selectedVS?.url && vs?.version === selectedVS?.version)
      if (matchingValueSetInCQF) {

        vsToUpdate = matchingValueSetInCQF
        vSetsToUpdate.push({ method: 'PUT', valueSet: matchingValueSetInCQF })
      } else {
        try {

          terminologyClient.setClient(bodyJson.selectedTerminologyServer)
          const terminologyClientInstance = terminologyClient.getClient()
          let matchingVSetsFromRemoteServer = await terminologyClientInstance.search({
            resourceType: 'ValueSet',
            searchParams: {
              url: selectedVS.url,
            }
          })
          console.log('matches found in remote: ', matchingVSetsFromRemoteServer)
          // add url from bundle since doesn't exist on resource
          if (matchingVSetsFromRemoteServer.entry) {
            matchingVSetsFromRemoteServer?.entry?.forEach((entryItem) => {
              const valueSet = entryItem.resource
              if (valueSet && !valueSet.url) {
                valueSet.url = entryItem.fullUrl
                vSetsToUpdate.push({ method: 'POST', valueSet })
              }
            })
          } else {
            console.error('no match found')
          }

        } catch (e) {
          console.error('error 2: ', e)
        }
      }
    }

    console.log('vsets to update: ', vSetsToUpdate)
    // handle if no vsets to update, too
    // add conditions to valueSet
    const valueSetItemsToUpdate = vSetsToUpdate?.map(vs => {
      const updatedVs = updateConditions(vs.valueSet, bodyJson.selectedConditions, false)
      return ({
        valueSet: updatedVs,
        method: vs.method
      })
    })

    try {
      const performedUpdate = await Promise.allSettled(valueSetItemsToUpdate.map(async (item) => {
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

      const failedUpdates = performedUpdate?.filter(promiseItem => promiseItem.status === 'rejected')
    } catch (e) {
      console.error('error 3', e)
    }

    // get groupers
    const groupersToUpdate = await Promise.all(bodyJson.selectedGroupers.map(async (grouperItem: any) => {
      return await fhirCdrClient.read({
        resourceType: 'ValueSet',
        id: grouperItem.id
      })
    }))

    try {
      // this assumes grouper already has a compose/include block, will need to be updated
      // when we allow users to create groupers
      await Promise.all(groupersToUpdate.map(async (grouperVs) => {
        console.log('original grouper: ', grouperVs.compose.include)
        console.log('selected valuesets:  ', bodyJson.selectedValueSets)
        const originalComposeInclude = grouperVs.compose.include[0].valueSet
        const newValueSetCanonicals = bodyJson.selectedValueSets.map((item: any) => item.url)
        // deduplicate with set
        const newComposeInclude = Array.from(new Set([...originalComposeInclude, ...newValueSetCanonicals]))
        grouperVs.compose.include[0].valueSet = newComposeInclude

        console.log('new grouper: ', newComposeInclude)
        await fhirCdrClient.update({
          resourceType: 'ValueSet',
          id: grouperVs.id,
          body: grouperVs
        })

      }))
    } catch (e) {
      console.error('error 4: ', e)
    }

    res.send(200)
  }
}
