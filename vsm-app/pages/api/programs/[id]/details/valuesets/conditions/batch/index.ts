import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from 'fhirClients'
import { updateConditions } from '@/helpers/conditionHelpers'
import handler from '@/helpers/server/handler'
import logger from '@/helpers/server/logger'
import cloneDeep from 'lodash.clonedeep'

interface BodyItems {
  leafIds: fhir4.ValueSet['id'][]
  conditionsToUpdate: any
  action: 'add' | 'remove'
}

const removeConditionsFromLeaf = (leafVs: fhir4.ValueSet, conditions: any) => {
  const ucBlock = leafVs.useContext

  // if no useContext at all, just return out
  if (!ucBlock) {
    return leafVs
  }
  console.log('conditions: ', conditions)
  console.log('ucBlock: ', ucBlock)

  console.log('valueCodeableConcept: ', ucBlock[3].valueCodeableConcept.coding)

  // working on this now
  const filteredUc = cloneDeep(ucBlock).filter(i => {
    return (
      i?.code?.system?.endsWith('usage-context-type')
      && i
    )
  })
}

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

    console.log('udpated: ', updated)

    return updated
  } else {
    const test = vSets.map(leaf => {
      return removeConditionsFromLeaf(leaf, conditions)
    })

    console.log('test: ', test)
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
    )

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

  // }
  // const valueSetToUpdate = await fhirCdrClient.search({
  //   resourceType: 'ValueSet',
  //   searchParams: {
  //     url: body?.canonical,
  //     version: body?.version
  //   }
  // })

  // const vs = valueSetToUpdate?.entry?.[0]?.resource

  // const updatedValueSet = updateConditions(vs, body.conditionInfo)

  // let updated
  // try {
  //   updated = await fhirCdrClient.update({
  //     resourceType: 'ValueSet',
  //     searchParams: {
  //       url: body?.canonical,
  //       version: body.version
  //     },
  //     body: updatedValueSet
  //   })
  //   res.status(200).send(updated)
  // } catch (e) {
  //   logger.error('error: ', e)
  //   res.status(400).send({ error: 'error' })
  }
}

export default handler({
  PUT: {
    action: handleBatchConditionUpdate,
    access: ['admin', 'editor']
  }
})
