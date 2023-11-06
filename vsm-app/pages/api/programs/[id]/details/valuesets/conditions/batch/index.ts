import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from 'fhirClients'
import { updateConditions, removeConditionsFromLeaf } from '@/helpers/conditionHelpers'
import handler from '@/helpers/server/handler'
import logger from '@/helpers/server/logger'
import cloneDeep from 'lodash.clonedeep'

interface BodyItems {
  leafIds: fhir4.ValueSet['id'][]
  conditionsToUpdate: any
  action: 'add' | 'remove'
}

// interface ConditionItem {
//   value: {
//     system: string
//     version: string
//     code: string
//     text: string
//   },
//   label: string
// }

const handleVsetConditionUpdates = (
  vSets: fhir4.ValueSet[],
  action: 'add' | 'remove',
  conditions: any
) => {
  console.log(action)
  if (action === 'add') {
    const updated = vSets.map(vs => {
      return updateConditions(vs, conditions, false)
    })

    return updated
  } else {
    // delete from conditions, only want to update those that had changes
    return vSets.map(leaf => removeConditionsFromLeaf(leaf, conditions)).filter(x => Boolean(x))
  }
}

const handleBatchConditionUpdate = async (req: NextApiRequest, res: NextApiResponse) => {

  const body = await JSON.parse(req.body)

  try {

    const leafIds = body.leafIds as fhir4.ValueSet['id'][]
    const conditionsToUpdate = body.conditionsToUpdate
    const action = body.action

    const getTransactionBody = leafIds.map(id => ({
      request: {
        method: 'GET',
        url: `ValueSet/${id}`
      }
    }))

    const getTransactionEntry = {
      resourceType: 'Bundle',
      type: 'transaction',
      entry: getTransactionBody
    }

    const allValueSetsToUpdate = await fhirCdrClient.transaction({
      body: getTransactionEntry
    })

    const successfulVsets = allValueSetsToUpdate
      ?.entry
      ?.map(e => e?.resource)
      ?.filter((item: fhir4.Resource) => item?.resourceType === 'ValueSet')


    const updated = handleVsetConditionUpdates(
      successfulVsets,
      action,
      conditionsToUpdate
    ).filter(x => Boolean(x))

    if (!updated) {
      // if nothing is updated, there's an error
      // this will throw to the handler
      throw Error('No Valuesets Updated')
    }

    const putTransactionBody = updated?.map(updatedVs => ({
      request: {
        method: 'PUT',
        url: `ValueSet/${updatedVs.id}`,
      },
      resource: updatedVs
    }))

    const putTransactionEntry = {
      resourceType: 'Bundle',
      type: 'transaction',
      entry: putTransactionBody
    }

    const updatedVsets = await fhirCdrClient.transaction({
      body: putTransactionEntry
    }) 

    console.log('updated: ', updatedVsets)

    res.status(200).send({ message: 'success' })

  } catch (e) {
    console.error(e?.response?.data?.issue)
    res.status(333).send('yikes')
  }
}

export default handler({
  PUT: {
    action: handleBatchConditionUpdate,
    access: ['admin', 'editor']
  }
})
