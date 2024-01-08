import { fhirCdrClient } from '@/fhirClients'
import { setVSPriority } from '@/helpers/libraryHelpers'
import handler from '@/helpers/server/handler'
import logger from '@/helpers/server/logger'
import type { NextApiRequest, NextApiResponse } from 'next'

const bulkUpdate = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const payload = req.body
    const { leafIds, priority } = payload
    const { id: programId } = req.query

    if (!leafIds?.length) {
      return res.status(400).json({ error: 'No Value Sets submitted for update' })
    }

    const allLeafReqs = leafIds.map((id: string[]) => ({
      request: {
        method: 'GET',
        url: `/ValueSet/${id}`
      }
    }))

    // some bulk operations need to update the program's relatedArtifacts
    // not the leafs
    let programToUpdate = await fhirCdrClient.read({
      resourceType: 'Library', 
      id: programId
    })

    const allLeafs = await fhirCdrClient.batch({body: {
      resourceType: 'Bundle',
      type: 'batch',
      entry: allLeafReqs
    }})

    // create success or failure groups in case can't find valueset, etc
    const resultGroups = allLeafs?.entry?.reduce((acc, current) => {
      if (current?.resource) {
        const newSuccess = [...acc.success, current.resource]
        acc.success = newSuccess
      } else {
        const failureText = current?.response?.outcome?.issue?.[0]?.diagnostics
        const newFailure = [...acc.failure, failureText]
        acc.failure = newFailure 
      }
      return acc
    }, {success: [], failure: []})

    if (priority) {
      programToUpdate = setVSPriority(programToUpdate, priority, [])
    }

    console.log('resultGroups: ', resultGroups)
    
    // const batchPrepVs = payload?.valueSets.map((vs: fhir4.ValueSet) => ({
    //   resource: vs,
    //   request: {
    //     method: 'PUT',
    //     url: `/ValueSet/${vs.id}`
    //   }
    // }))

    console.log('batch: ', allLeafs)

    // const response = await fhirCdrClient.batch({body: {
    //   resourceType: 'Bundle',
    //   type: 'batch',
    //   entry: batchPrepVs
    // }})
    // const errors = response.entry.find((i: any) => !i.response?.status.includes('200'))
    // if (errors) {
    //   throw new Error(`Error updating ValueSets: ${JSON.stringify(errors)}`)
    // }
    res.status(200).json({ success: true })
  } catch (e) {
    console.log('e here: ', e)
    logger.error(e)
    res.status(400).json({ error: 'Updating ValueSet failed' })
  }
}

export default handler({
  PUT: { action: bulkUpdate, access: ['admin', 'editor'] }
})