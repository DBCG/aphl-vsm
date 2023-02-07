// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from 'fhirClients'
import { removeValueSetFromGrouper, addValueSetToGrouper } from '@/helpers/valueSetHelpers'
import handler from '@/helpers/server/handler'
import { grouperValueSetBase } from '@/helpers/grouperValuesetBase'
import { cloneDeep } from 'sequelize/types/utils'

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

      // there is an issue in the sample data where grouper valuesets have the exact same url
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
    const { grouperInfo, vsCanonicals } = body

    // step 1, create the grouper to be saved
    let grouperClone = Object.assign(cloneDeep(grouperValueSetBase), grouperInfo)
  
    // step 2, add valueset info to compose.include within grouper valueset (add authoritative source?)
    const fullGrouper = addValueSetToGrouper(grouperClone, vsCanonicals)
    // step 3, save leaf valuesets to CQF (different API call)
    // step 4, update the grouper library to include the new grouper using updateGrouperLibrary
    let response = {}
    try {
      response = fhirCdrClient.create({
        resourceType: 'ValueSet',
        body: fullGrouper
      })
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