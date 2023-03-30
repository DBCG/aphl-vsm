import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient, vsacFhirClient } from 'fhirClients'
import { updateConditions } from '@/helpers/conditionHelpers'
import { addExtensionToVs, authoritativeSourceExtensionUrl } from '@/helpers/valueSetHelpers'
import { terminologyClient } from 'fhirClients'
import { terminologyServerEndpoints } from 'fhirClientOptions'
import { is } from '@/helpers/is'
import { LeafsToAdd } from '@/components/ValueSetSearchTable'
import handler from '@/helpers/server/handler'

const getValueSet = async (req: NextApiRequest, res: NextApiResponse<fhir4.ValueSet | { error: string }>) => {
  try {
    const response = (await fhirCdrClient.read({ resourceType: 'ValueSet', id: req.query.id as string })) as fhir4.ValueSet

    res.status(200).send(response)
  } catch (e) {
    console.error(e)
    res.status(400).json({ error: 'Loading ValueSets failed' })
  }
}

const updateValueSet = async (req: NextApiRequest, res: NextApiResponse<number | { error: string }>) => {
  if (req.method === 'PUT') {
    const body = await req.body
    const bodyJson: LeafsToAdd = JSON.parse(body)

    let vSetsToUpdate: { method: 'PUT' | 'POST'; valueSet: fhir4.ValueSet }[] = []
    let vsToUpdate

    // check fhir server first to see if we already have the selected valueSets
    const serverResponses = await Promise.allSettled(
      bodyJson?.selectedValueSets?.map((item) =>
        fhirCdrClient.search({
          resourceType: 'ValueSet',
          searchParams: {
            url: item.url?.split('-')?.[0] || '',
            version: item.version || ''
          }
        })
      )
    )

    const existingVSetBundles = serverResponses
      ?.map((item) => item?.status === 'fulfilled' && item?.value)
      ?.filter((x) => x) as fhir4.Bundle[]

    const filteredVSets = existingVSetBundles?.map((item) => item?.entry?.[0]?.resource)?.filter((z) => Boolean(z)) as fhir4.ValueSet[]

    for (const selectedVS of bodyJson.selectedValueSets) {
      const matchingValueSetInCQF = filteredVSets?.find(
        (vs) => vs?.url === selectedVS?.url?.split('-')?.[0] && vs?.version === selectedVS?.version
      )
      // valueset already exists in our server, don't need to call other terminology server
      if (matchingValueSetInCQF) {
        vsToUpdate = matchingValueSetInCQF
        vSetsToUpdate.push({ method: 'PUT', valueSet: matchingValueSetInCQF })
      } else {
        try {
          terminologyClient.setClient(bodyJson.selectedTerminologyServer)
          const terminologyClientInstance = terminologyClient.getClient()
          if (terminologyClientInstance) {
            let url = selectedVS?.url?.split('-')[0]
            if (is.string(url)) {
              // get all matching valuesets
              // vsac doesn't support _sort so doing this broader search + sorting below
              const allAvailableMatches = await terminologyClientInstance.search({
                resourceType: 'ValueSet',
                searchParams: {
                  url
                }
              })

              if (allAvailableMatches.entry) {
                // sorting here because we cannot use _sort on VSAC server -- not supported
                const orderedMatchingVSets = allAvailableMatches.entry
                  .map((e: fhir4.BundleEntry) => e.resource)
                  .sort((a: fhir4.ValueSet, b: fhir4.ValueSet) => b.version?.localeCompare(a.version || '') || '')
                let matchingVSetFromRemoteServer: fhir4.ValueSet = (await terminologyClientInstance.read({
                  resourceType: 'ValueSet',
                  id: orderedMatchingVSets[0].id
                })) as fhir4.ValueSet

                if (is.valueSet(matchingVSetFromRemoteServer)) {
                  const authSrcUrl = terminologyServerEndpoints?.find(
                    (grp) => grp.value.title.toLowerCase() === bodyJson.selectedTerminologyServer.toLowerCase()
                  )?.value?.url

                  if (authSrcUrl) {
                    // add authoritativeSource extension
                    // this allows us to keep track of where valuesets come from
                    matchingVSetFromRemoteServer = addExtensionToVs(
                      matchingVSetFromRemoteServer,
                      authoritativeSourceExtensionUrl,
                      authSrcUrl
                    )
                  }

                  vSetsToUpdate.push({ method: 'POST', valueSet: matchingVSetFromRemoteServer })
                } else {
                  console.error('no match found')
                  res.status(400).json({ error: `no match found` })
                }
              } else {
                res.status(400).json({ error: `Could not find ValueSet with url ${url}` })
                return
              }
            } else {
              res.status(400).json({ error: `Could not find url: ${url}` })
              return
            }
          } else {
            res.status(500).json({ error: `Could not access terminology server` })
            return
          }
        } catch (e) {
          res.status(400).json({ error: `Error adding ValueSet with url ${selectedVS.url}` })
          return
        }
      }
    }

    // handle if no vsets to update, too
    // add conditions to valueSet
    const valueSetItemsToUpdate = vSetsToUpdate?.map((vs) => {
      const updatedVs = updateConditions(vs.valueSet, bodyJson.selectedConditions, false)
      return {
        valueSet: updatedVs,
        method: vs.method
      }
    })

    try {
      const performedUpdate = await Promise.allSettled(
        valueSetItemsToUpdate.map(async (item) => {
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
        })
      )

      const failedUpdates = performedUpdate?.filter((promiseItem) => promiseItem.status === 'rejected')
      console.error('failed updates: ', failedUpdates)
      res.status(400).json({ error: 'failed to update valueSet' })
    } catch (e) {
      console.error('error 3', e)
    }

    // get groupers
    const groupersToUpdate = await Promise.all(
      bodyJson.selectedGroupers.map(async (grouperItem: any) => {
        return await fhirCdrClient.read({
          resourceType: 'ValueSet',
          id: grouperItem.id
        })
      })
    )

    try {
      // this assumes grouper already has a compose/include block, will need to be updated
      // when we allow users to create groupers
      await Promise.all(
        groupersToUpdate.map(async (grouperVs) => {
          const originalComposeInclude: fhir4.ValueSetComposeInclude[] = grouperVs.compose.include

          const newValueSetCanonicals = bodyJson.selectedValueSets
            .map((item: any) => item.url.split('-')[0])
            .filter((canonical) => originalComposeInclude?.find((item) => item?.valueSet?.[0] !== canonical))

          const newItems = newValueSetCanonicals?.map((c) => ({ valueSet: [c] }))

          let newComposeInclude = [...originalComposeInclude, ...newItems]

          grouperVs.compose.include = newComposeInclude

          await fhirCdrClient.update({
            resourceType: 'ValueSet',
            id: grouperVs.id,
            body: grouperVs
          })
        })
      )
    } catch (e) {
      console.error('error 4: ', e)
      res.status(400).json({ error: 'failed to update valueSet' })
    }

    res.status(200).send(200)
  }
}

export default handler({
  GET: { action: getValueSet },
  PUT: { action: updateValueSet }
})
