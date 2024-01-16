import { fhirCdrClient } from '@/fhirClients'
import { setVSPriority } from '@/helpers/libraryHelpers'
import handler from '@/helpers/server/handler'
import logger from '@/helpers/server/logger'
import { logSimpleError } from '@/helpers/server/simpleHapiError'
import type { NextApiRequest, NextApiResponse } from 'next'
import { NextApiRequestQuery } from 'next/dist/server/api-utils'

interface Query extends NextApiRequestQuery {
  id: string
}

// bulk update for conditions, groupers, and priority
// currently will only handle one update type at a time
const bulkUpdate = async (req: NextApiRequest, res: NextApiResponse) => {
  console.log('this called')
  try {
    const payload = req.body
    const { leafIds, priority, leafUrls } = payload
    const { id: programId } = req.query as Query
    console.log(payload)
    // if (!leafIds?.length) {
    //   return res.status(400).json({ error: 'No Value Sets submitted for update' })
    // }

    // priority is set on the base Program Library
    if (priority) {
      let programToUpdate = await fhirCdrClient.read({
        resourceType: 'Library', 
        id: programId
      }) as fhir4.Library

      programToUpdate = setVSPriority(programToUpdate, priority, leafUrls)

      const updated = await fhirCdrClient.update({
        resourceType: 'Library',
        id: programId,
        body: programToUpdate
      })

      if (updated.resourceType === 'Library') {
        return res.status(200).json({ success: true })
      } else {
        logSimpleError('Error attempting priority bulk update')
        return res.status(500).json({ error: 'Priority update failed' })
      }
    } else {
      // handle leaf-based changes
      const allLeafReqs = leafIds.map((id: string[]) => ({
        request: {
          method: 'GET',
          url: `/ValueSet/${id}`
        }
      }))
  
      // some bulk operations need to update the program's relatedArtifacts
      // not the leafs
      const allLeafs = await fhirCdrClient.batch({
        body: {
          resourceType: 'Bundle',
          type: 'batch',
          entry: allLeafReqs
        }
      })
  
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

    }



    
    // const batchPrepVs = payload?.valueSets.map((vs: fhir4.ValueSet) => ({
    //   resource: vs,
    //   request: {
    //     method: 'PUT',
    //     url: `/ValueSet/${vs.id}`
    //   }
    // }))

    // console.log('batch: ', allLeafs)

    // const response = await fhirCdrClient.batch({body: {
    //   resourceType: 'Bundle',
    //   type: 'batch',
    //   entry: batchPrepVs
    // }})
    // const errors = response.entry.find((i: any) => !i.response?.status.includes('200'))
    // if (errors) {
    //   throw new Error(`Error updating ValueSets: ${JSON.stringify(errors)}`)
    // }
  } catch (e) {
    console.log('e: ', e)
    logSimpleError(e)
    res.status(400).json({ error: 'Bulk ValueSet update failed' })
  }
}

export default handler({
  PUT: { action: bulkUpdate, access: ['admin', 'editor'] }
})