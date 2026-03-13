import FhirClient from '@/backend/clients/FhirCdrClient'
import { Condition } from '@/helpers/conditionHelpers'
import { setVSPriority, setVSConditions, updateGrouperLeafs } from '@/helpers/libraryHelpers'
import handler from '@/helpers/server/handler'
import { logSimpleError } from '@/helpers/server/simpleHapiError'
import { cloneDeep } from 'lodash'
import type { NextApiRequest, NextApiResponse } from 'next'
import { NextApiRequestQuery } from 'next/dist/server/api-utils'
import { formatBatchGrouperUpdate } from '../../../grouper/valueset'

interface Query extends NextApiRequestQuery {
  id: string
}

interface GrouperItem {
  value: string | undefined
  label: string | undefined
  id: string
}

// bulk update for conditions, groupers, and priority
// currently will only handle one update type at a time
const bulkUpdate = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const payload = req.body
    const { priorityToEdit, leafUrls, conditionsToUpdate, action, groupersToUpdate } = payload
    const { id: programId } = req.query as Query

    // update valueset groupers
    // grouper updates happen at the grouper level, not program
    if (groupersToUpdate?.length) {
      const allGrouperIdsForUpdate = groupersToUpdate.map((i: GrouperItem) => i.id)
      const grouperReqItems = allGrouperIdsForUpdate?.map((id: string) => ({
        request: {
          resourceType: 'ValueSet',
          method: 'GET',
          url: `/ValueSet/${id}`
        }
      }))
      
      const response = await FhirClient.getInstance().batch({body: {
        resourceType: 'Bundle',
        type: 'batch',
        entry: grouperReqItems
      }})

      const errors = response.entry.find((i: any) => !i?.response?.status?.includes('200'))
      if (errors) {
        throw new Error(`Error retrieving groupers with ids: ${JSON.stringify(allGrouperIdsForUpdate)}`)
      }

      const groupers = response.entry.map((e: fhir4.BundleEntry) => e.resource)

      const updatedGroupers = groupers.map((grouper: fhir4.ValueSet) => {
        return updateGrouperLeafs(grouper, leafUrls, action).grouper
      })

      const formattedUpdate = formatBatchGrouperUpdate(updatedGroupers)
      let grouperUpdateResponse
      try {
        grouperUpdateResponse = await FhirClient.getInstance().transaction({
          body: formattedUpdate
        })

      } catch (e) {
        logSimpleError(e, 'bulkUpdate function')
      }

      if (grouperUpdateResponse?.entry) {
        return res.status(200).json(grouperUpdateResponse) 
      } else {
        return res.status(501).json({ error: 'Failed to update groupers' })  
      }
    }

    // handle priority and conditions which both need the program library
    const programToUpdate = await FhirClient.getInstance().read({
      resourceType: 'Library', 
      id: programId
    }) as fhir4.Library

    let clonedProgram = cloneDeep(programToUpdate)

    // update priority
    if (priorityToEdit) {
      clonedProgram = setVSPriority(clonedProgram, priorityToEdit.value, leafUrls)
    // update conditions
    } else if (conditionsToUpdate?.length) {
      clonedProgram = setVSConditions(clonedProgram, conditionsToUpdate as Condition[], leafUrls, action)
    } else {
      return res.status(501).json({ error: 'Bulk update not implemented for this item' }) 
    }

    const updated = await FhirClient.getInstance().update({
      resourceType: 'Library',
      id: programId,
      body: clonedProgram
    })

    if (updated.resourceType === 'Library') {
      return res.status(200).json({ success: true })
    } else {
      logSimpleError('Error attempting bulk update')
      return res.status(500).json({ error: 'Bulk update failed' })
    }
  } catch (e) {
    logSimpleError(e)
    res.status(400).json({ error: 'Bulk ValueSet update failed' })
  }
}

export default handler({
  PUT: { action: bulkUpdate, access: ['admin', 'publisher', 'editor'] }
})