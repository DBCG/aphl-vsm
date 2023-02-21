// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient, terminologyClient } from 'fhirClients'
import {
  removeValueSetFromGrouper,
  addValueSetToGrouper,
  addExtensionToVs,
  authoritativeSourceExtensionUrl
} from '@/helpers/valueSetHelpers'
import { updateConditions } from '@/helpers/conditionHelpers'
import handler from '@/helpers/server/handler'
import { grouperValueSetBase } from '@/helpers/grouperValuesetBase'
import cloneDeep from 'lodash.clonedeep'
import { is } from '@/helpers/is'

const updateGroupers = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  try {
    const body = JSON.parse(req.body)
    const { vsCanonical, grouperCanonicals } = body

    const groupersToUpdate = []
    for (const grouperC of grouperCanonicals) {
      const grouperValueSetBundle = await fhirCdrClient.search({
        resourceType: 'ValueSet',
        searchParams: {
          url: grouperC
        }
      }) as fhir4.Bundle

      // there is an issue in the sample data where several grouper valuesets have the exact same url
      const grouperVsToUpdate = grouperValueSetBundle?.entry?.[0]?.resource as fhir4.ValueSet

      if (grouperVsToUpdate) {
        const updatedGrouper = removeValueSetFromGrouper(grouperVsToUpdate, vsCanonical)

        groupersToUpdate.push(updatedGrouper)
        await Promise.all(groupersToUpdate.map(grouperVs => (
          fhirCdrClient.update({
            resourceType: 'ValueSet',
            id: grouperVs.id,
            body: grouperVs
          })
        )))
      }
    }
    return res.status(200).send(groupersToUpdate)
  } catch (e) {
    console.error('error: ', e)
    res.status(400).send({ error: 'error'})
  }
}

const addGrouper = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  try {
    const body = JSON.parse(req.body)
    let savedGrouper

    const { grouperVSets, grouperMetadata, grouperLibraryId } = body

    // step 1, grab all full (non-subsetted) leaf valuesets from term server w/ Read operation
    let leafs = []
    for (const vsInfo of grouperVSets) {
      let currentLeaf
      // check CDR to see if leaf VS exists first
      const leafsInCDR = await fhirCdrClient.search({
        resourceType: 'ValueSet',
        searchParams: {
          url: vsInfo.selectedVS.url,
          _sort: ['-_version'] // get latest on top
          // also filter by terminology server?
        }
      })

      const latestLeafInCDR = leafsInCDR?.entry?.[0]

      // if the leaf exists in the FHIR server already
      if (is.valueSet(latestLeafInCDR)) {
        console.log('Match found in CDR');
        currentLeaf = latestLeafInCDR
      } else {
      // if not, look in the terminology server
      console.log('No match found in CDR, searching terminology server');
      terminologyClient.setClient(vsInfo.selectedTerminologyServer)
      let client = terminologyClient.getClient()

       currentLeaf = await client?.read({
        resourceType: 'ValueSet',
        id: vsInfo.selectedVS.id
      })

      // check to make sure leaf is not an operationOutcome...
      // currentLeaf could be from CDR or Term server at this point
      if (is.valueSet(currentLeaf)) {
        // add authoritativeSource extension
        currentLeaf = addExtensionToVs(currentLeaf, authoritativeSourceExtensionUrl, vsInfo.selectedTerminologyServer)
  
        // add associated conditions
        currentLeaf = updateConditions(currentLeaf, vsInfo.selectedConditions, false)
        
        // add to group of leaf vsets that will be saved
        leafs.push(currentLeaf)
      } else {
        console.error(
          `Failed to GET leaf valueset id ${vsInfo.selectedVs.id} from term server ${vsInfo.selectedTerminologyServer}`
        )
        // early return if doesn't could not get leaf?
        res.status(400).send({ error: 'Failed to get leaf valueset'})
        return
      }
    }
    leafs.push(currentLeaf)
  }

    // save leafs to FHIR server
    try {
      const result = await Promise.allSettled(leafs.map(async l => {
        await fhirCdrClient.create({
          resourceType: 'ValueSet',
          body: l
        })
      }))

      // TODO handle failures
      const failedUpdates = result?.filter(promiseItem => promiseItem.status === 'rejected')

    } catch(e) {
      console.error('Failed to save leaf to FHIR server')
    }


    // step 2, create the grouper to be saved
    // ...rest is all info that is simply on the obj, author is an extension
    // so not a simple obj merge there
    const { author, ...rest} = grouperMetadata
    let grouperClone = Object.assign(cloneDeep(grouperValueSetBase), rest)

    // add author extension
    grouperClone.extension = [
      {
        url: 'http://hl7.org/fhir/StructureDefinition/valueset-author',
        valueContactDetail: { name: author }
      }
    ]
    // add url to grouper
    grouperClone.url = `${process.env.NEXT_PUBLIC_DEFAULT_PUBLISHING_URL}/ValueSet/${rest.name}`

    // create compose.include and add valuesets
    grouperClone.compose = { include: [] }

    const valueSetsToAdd = grouperVSets.map(vsGroup => (
      { valueSet: [ vsGroup.url ]}
    ))
    grouperClone.compose.include = valueSetsToAdd

    try {
      savedGrouper = await fhirCdrClient.create({
        resourceType: 'ValueSet',
        body: grouperClone
      })
    } catch (e) {
      console.error('failed to save grouper clone')
    }

    // step 4, update the grouper library to include the new grouper using updateGrouperLibrary
    let response = {}
    try {
      const grouperLibrary = await fhirCdrClient.read({
        resourceType: 'Library',
        id: grouperLibraryId
      })

      if (is.library(grouperLibrary)) {
        
      }
      
    } catch (e) {
      console.error('Grouper creation failed')
      res.status(400).send({ error: 'Grouper creation failed'})
    }

    return res.status(200).send(response)
  } catch (e) {
    console.error('error: ', e)
    res.status(400).send({ error: 'Could not create grouper'})
  }
}

export default handler({
  PUT: {
    action: updateGroupers,
    access: ['admin', 'editor']
  },
  POST: {
    action: addGrouper,
    access: ['admin', 'editor']
  },
})