import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from 'fhirClients'
import { is } from '@/helpers/is'
import { Condition } from '@/helpers/conditionHelpers'
import handler from '@/helpers/server/handler'
import { batchEditData } from '@/components/ProgramValueSetDetails/TableActions'
import { removeVSConditions, setVSConditions } from '@/helpers/libraryHelpers'

const handleBatchConditionUpdate = async (req: NextApiRequest, res: NextApiResponse) => {

  const body = req.body as batchEditData
  const programId = req.query.id as string
  let program = (await fhirCdrClient.read({ resourceType: 'Library', id: programId })) as fhir4.Library
  if (!is.library(program)) {
    return res.status(404).send({ message: 'Program not found for updating conditions' })
  }

  const leafIds = body.leafIds
  const conditionsToUpdate = body.conditionsToUpdate
  const action = body.action

  const getTransactionBody = leafIds.map((id) => ({
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

  const successfulVsets = allValueSetsToUpdate?.entry?.map((e: any) => e?.resource)?.filter((item: fhir4.Resource) => is.valueSet(item))

  if (action === 'add') {
    successfulVsets.forEach((vs: fhir4.ValueSet) => {
      program = setVSConditions(program, conditionsToUpdate as Condition[], vs.url!)
    })
  } else if (action === 'remove') {
    successfulVsets.forEach((vs: fhir4.ValueSet) => {
      program = removeVSConditions(program, conditionsToUpdate as Condition[], vs.url!)
    })
  }
  res.status(200).send({ message: 'success' })
}

export default handler({
  PUT: {
    action: handleBatchConditionUpdate,
    access: ['admin', 'editor']
  }
})
