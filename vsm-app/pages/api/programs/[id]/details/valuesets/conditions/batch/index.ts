import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from 'fhirClients'
import { is } from '@/helpers/is'
import { Condition } from '@/helpers/conditionHelpers'
import handler from '@/helpers/server/handler'
import { batchEditData } from '@/components/ProgramValueSetDetails/TableActions'
import { setVSConditions } from '@/helpers/libraryHelpers'
import getProgramAndGrouper from '@/helpers/server/getProgramAndGrouper'
import logger from '@/helpers/server/logger'

const handleBatchConditionUpdate = async (req: NextApiRequest, res: NextApiResponse) => {
  const body = req.body as batchEditData
  const programId = req.query.id as string
  let { grouperVSets, programLibrary } = await getProgramAndGrouper(programId)
  if (!is.library(programLibrary)) {
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

  const allValueSetsToUpdate = await fhirCdrClient.transaction({ body: getTransactionEntry })
  const successfulVsets = allValueSetsToUpdate?.entry?.map((e: any) => e?.resource)?.filter((item: fhir4.Resource) => is.valueSet(item))

  // Construct a map of all the grouper value sets and their versions if available
  const grouperVSUrlVersionMap = {} as Record<string, string>
  grouperVSets.forEach((vs: fhir4.ValueSet) => {
    vs.compose?.include?.forEach((include) => {
      const fullCanonical = include?.valueSet?.[0] || ''
      const [url, version] = fullCanonical.split('|')
      grouperVSUrlVersionMap[url] = version ? url : `${url}|${version}`
    })
  })

  successfulVsets.forEach((vs: fhir4.ValueSet) => {
    if (!grouperVSUrlVersionMap[vs.url!]) {
      logger.error('Could not find valueset canonical set in Grouper')
      throw new Error('Could not find valueset canonical set in Grouper')
    }
    programLibrary = setVSConditions(programLibrary, conditionsToUpdate as Condition[], vs.url!, action!)
  })

  await fhirCdrClient.update({
    resourceType: 'Library',
    id: programId,
    body: programLibrary
  })
  res.status(200).send({ message: 'success' })
}

export default handler({
  PUT: {
    action: handleBatchConditionUpdate,
    access: ['admin', 'editor']
  }
})
