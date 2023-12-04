import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from 'fhirClients'
import { is } from '@/helpers/is'
import { updateConditions, removeConditionsFromLeaf, Condition } from '@/helpers/conditionHelpers'
import handler from '@/helpers/server/handler'
import { batchEditData } from '@/components/ProgramValueSetDetails/TableActions'
import { MultiValue } from 'react-select'

const handleVsetConditionUpdates = (
  vSets: fhir4.ValueSet[],
  action: 'add' | 'remove' | null,
  conditions: MultiValue<Condition>
) => {
  if (action === 'add') {
    const updated = vSets.map(vs => {
      // make conditions mutable
      return updateConditions(vs, conditions as Condition[], false)
    })

    return updated
  } else if (action === 'remove') {
    // delete from conditions, only want to update those that had changes
    return vSets.map(leaf => removeConditionsFromLeaf(leaf, conditions as Condition[])).filter(x => Boolean(x))
  }
}

const handleBatchConditionUpdate = async (req: NextApiRequest, res: NextApiResponse) => {

  const body = req.body as batchEditData

  const leafIds = body.leafIds
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
  } as fhir4.Resource & { type: 'transaction' }

  const allValueSetsToUpdate = await fhirCdrClient.transaction({
    body: getTransactionEntry
  })

  const successfulVsets = allValueSetsToUpdate
    ?.entry
    ?.map((e: any) => e?.resource)
    ?.filter((item: fhir4.Resource) => is.valueSet(item))


  const updated = (handleVsetConditionUpdates(
    successfulVsets,
    action,
    conditionsToUpdate
  )?.filter(x => is.valueSet(x)) || []) as fhir4.ValueSet[]

  if (!updated.length) {
    // if nothing is updated, there's an error
    // this will throw to the handler
    throw Error('No Valuesets Updated')
  }

  const putTransactionBody = updated.map(updatedVs => ({
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
  } as fhir4.Resource & { type: 'transaction' }

  await fhirCdrClient.transaction({
    body: putTransactionEntry
  })

  res.status(200).send({ message: 'success' })
}

export default handler({
  PUT: {
    action: handleBatchConditionUpdate,
    access: ['admin', 'editor']
  }
})
