import type { NextApiRequest, NextApiResponse } from 'next'
import { set } from 'lodash'
import { fhirCdrClient } from 'fhirClients'
import { addExtensionToVs, addProfileToValueSet, EXTENSIONS, idWithoutVersion, urlWithoutVersion } from '@/helpers/valueSetHelpers'
import { terminologyClient } from 'fhirClients'
import { terminologyServerEndpoints } from 'fhirClientOptions'
import { is } from '@/helpers/is'
import { LeafsToAdd } from '@/components/ValueSetSearchTable'
import handler from '@/helpers/server/handler'
import logger from '@/helpers/server/logger'
import { setVSConditions } from '@/helpers/libraryHelpers'

const getValueSet = async (req: NextApiRequest, res: NextApiResponse<fhir4.ValueSet | { error: string }>) => {
  try {
    const response = (await fhirCdrClient.read({ resourceType: 'ValueSet', id: req.query.id as string })) as fhir4.ValueSet

    res.status(200).send(response)
  } catch (e) {
    logger.error(e)
    res.status(400).json({ error: 'Loading ValueSets failed' })
  }
}

const updateValueSet = async (req: NextApiRequest, res: NextApiResponse<number | { error: string }>) => {
  const body = await req.body

  if (body?.selectedConditions?.length > 0 && !req.query.programId) {
    return res.status(400).json({ error: 'missing program Id required for conditions' })
  }

  let vSetsToUpdate: { valueSet: fhir4.ValueSet }[] = []

  // check fhir server first to see if we already have the selected valueSets
  const serverResponses = await Promise.allSettled(
    body?.selectedValueSets?.map((item: fhir4.ValueSet) =>
      fhirCdrClient.search({
        resourceType: 'ValueSet',
        searchParams: {
          url: item.url?.split('|')?.[0] || '',
          version: item.version || ''
        }
      })
    )
  )

  const existingVSetBundles = serverResponses
    ?.map((item) => item?.status === 'fulfilled' && item?.value)
    ?.filter((x) => x) as fhir4.Bundle[]

  const filteredVSets = existingVSetBundles?.map((item) => item?.entry?.[0]?.resource)?.filter((z) => Boolean(z)) as fhir4.ValueSet[]

  for (const selectedVS of body.selectedValueSets) {
    const matchingValueSetInCQF = filteredVSets?.find(
      (vs) => vs?.url === selectedVS?.url?.split('|')?.[0] && vs?.version === selectedVS?.version
    )
    // valueset already exists in our server, don't need to call other terminology server
    if (matchingValueSetInCQF) {
      const updatedMatchingValueSetInCQF = addProfileToValueSet(matchingValueSetInCQF)
      vSetsToUpdate.push({ valueSet: updatedMatchingValueSetInCQF })
    } else {
      try {
        terminologyClient.setClient(body.selectedTerminologyServer)
        const terminologyClientInstance = terminologyClient.getClient()
        if (terminologyClientInstance) {
          let url = idWithoutVersion(selectedVS?.url as string)
          if (is.string(url)) {
            // get all matching valuesets
            // vsac doesn't support _sort so doing this broader search + sorting below
            const allAvailableMatches = await terminologyClientInstance.search({
              resourceType: 'ValueSet',
              searchParams: {
                url
              }
            })

            if (allAvailableMatches?.entry) {
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
                  (grp) => grp.value.title.toLowerCase() === body.selectedTerminologyServer.toLowerCase()
                )?.value?.url

                if (authSrcUrl) {
                  // add authoritativeSource extension
                  // this allows us to keep track of where valuesets come from
                  matchingVSetFromRemoteServer = addExtensionToVs(matchingVSetFromRemoteServer, EXTENSIONS.AUTH_SOURCE_EXTENSION_URL, authSrcUrl)
                }

                const updatedMatchingVSetFromRemoteServer = addProfileToValueSet(matchingVSetFromRemoteServer)
                vSetsToUpdate.push({ valueSet: updatedMatchingVSetFromRemoteServer })
              } else {
                logger.error('no match found')
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

  try {

    let program = await fhirCdrClient.read({
      resourceType: 'Library',
      id: req.query.programId as string
    }) as fhir4.Library

    const bundlePayload = []
    vSetsToUpdate.forEach((vs) => {
      program = setVSConditions(program, body.selectedConditions, [vs.valueSet.url!], 'add')
      bundlePayload.push({
        resource: vs.valueSet,
        request: {
          method: 'PUT',
          url: `ValueSet/${vs.valueSet.id}`
        }
      })
    })

    bundlePayload.push({
      resource: program,
      request: {
        method: 'PUT',
        url: `Library/${program.id}`
      }
    })

    const performedUpdate = await fhirCdrClient.transaction({
      body: {
        resourceType: 'Bundle',
        type: 'transaction',
        entry: bundlePayload
      }
    })

    if (!performedUpdate?.entry) {
      // @ts-ignore
      return res.status(400).json({ error: 'Failed to update Value Sets' })
    }
  } catch (e) {
    return res.status(400).json({ error: 'Server error encountered while updating Value Sets' })
  }

  // get groupers
  const groupersToUpdate = await Promise.all(
    body.selectedGroupers.map(async (grouperItem: any) => {
      return await fhirCdrClient.read({
        resourceType: 'ValueSet',
        id: grouperItem.id
      })
    })
  )

  try {
    const result = await Promise.all(
      groupersToUpdate.map(async (grouperVs) => {
        const originalComposeInclude: fhir4.ValueSetComposeInclude[] = grouperVs?.compose?.include || []

        const newValueSetCanonicals = body.selectedValueSets
          .map((item: any) => urlWithoutVersion(item.url))
          // return only things that don't already exist
          .filter((canonical: string) => {
            if (originalComposeInclude.length == 0) return canonical
            return originalComposeInclude?.find((item) => item?.valueSet?.[0] !== canonical)
          })

        const newItems = newValueSetCanonicals?.map((c: string) => ({ valueSet: [c] }))

        let newComposeInclude = [...originalComposeInclude, ...newItems]

        // this sets the compose include whether it exists or not
        set(grouperVs, 'compose.include', newComposeInclude)

        return await fhirCdrClient.update({
          resourceType: 'ValueSet',
          id: grouperVs.id,
          body: grouperVs
        })
      })
    )

    const validResults = result?.filter((r) => r.resourceType === 'ValueSet')
    if (validResults?.length && validResults?.length > 0) {
      return res.status(200).send(200)
    } else {
      res.status(400).json({ error: 'could not update valueset' })
    }
  } catch (e) {
    logger.error('error 4: ', e)
    res.status(400).json({ error: 'failed to update valueSet' })
  }
}

export default handler({
  GET: { action: getValueSet },
  PUT: { action: updateValueSet, access: ['admin', 'editor'] }
})
