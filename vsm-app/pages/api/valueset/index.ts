// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient, vsacFhirClient } from 'fhirClients'
import { updateConditions } from '@/helpers/conditionHelpers'
import { addExtensionToVs, authoritativeSourceExtensionUrl } from '@/helpers/valueSetHelpers'
import { getSession } from 'next-auth/react'
import { terminologyClient } from 'fhirClients'
import { terminologyServerEndpoints } from 'fhirClientOptions'
import { is } from '@/helpers/is'

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
      // valueset already exists in our server, don't need to call other terminology server
      if (matchingValueSetInCQF) {
        vsToUpdate = matchingValueSetInCQF
        vSetsToUpdate.push({ method: 'PUT', valueSet: matchingValueSetInCQF })
      } else {
        try {
          terminologyClient.setClient(bodyJson.selectedTerminologyServer)
          const terminologyClientInstance = terminologyClient.getClient()
          if (terminologyClientInstance) {

            // get all matching valuesets
            // vsac doesn't support _sort so doing this broader search + sorting below
            const allAvailableMatches = await terminologyClientInstance.search({
              resourceType: 'ValueSet',
              searchParams: {
                url: selectedVS.url
              }
            })

            if (allAvailableMatches.entry) {
              // sorting here because we cannot use _sort on VSAC server -- not supported
              const orderedMatchingVSets = allAvailableMatches.entry
                .map((e: fhir4.BundleEntry) => e.resource)
                // @ts-ignore-next-line
                .sort((a: fhir4.ValueSet, b: fhir4.ValueSet) => b.version.localeCompare(a.version))
              let matchingVSetFromRemoteServer = await terminologyClientInstance.read({
                resourceType: 'ValueSet',
                id: orderedMatchingVSets[0].id
              })

              if (is.valueSet(matchingVSetFromRemoteServer)) {
                const vsUrl = terminologyServerEndpoints
                  ?.find(grp => grp.value.title.toLowerCase() === bodyJson.selectedTerminologyServer.toLowerCase())
                  ?.value?.url

                if (vsUrl) {
                  // add authoritativeSource extension
                  // this allows us to keep track of where valuesets come from
                  matchingVSetFromRemoteServer = addExtensionToVs(matchingVSetFromRemoteServer, authoritativeSourceExtensionUrl, vsUrl)
                }

                vSetsToUpdate.push({ method: 'POST', valueSet: matchingVSetFromRemoteServer })

              } else {
                console.error('no match found')
              }
            }

          } else {
            throw new Error('Terminology client is not defined')
          }

        } catch (e) {
          console.error('error 2: ', e)
        }
      }
    }

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
      console.error('failed updates: ', failedUpdates)
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
        const originalComposeInclude = grouperVs.compose.include[0].valueSet
        const newValueSetCanonicals = bodyJson.selectedValueSets.map((item: any) => item.url)
        // deduplicate with set
        const newComposeInclude = Array.from(new Set([...originalComposeInclude, ...newValueSetCanonicals]))
        grouperVs.compose.include[0].valueSet = newComposeInclude

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
