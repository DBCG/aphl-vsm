import { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from '@/fhirClients'
import logger from '@/helpers/server/logger'
import handler from '@/helpers/server/handler'
import { HapiError } from '@/types/hapiError'
import { logSimpleError } from '@/helpers/server/simpleHapiError'

const updateOwnedResources = async (req: NextApiRequest, res: NextApiResponse<{} | { error: string }>) => {
  try {
    const { programVersion, programStatus, isExperimental } = JSON.parse(req.body)
    if (programStatus === 'active') {
      logger.error('Cannot edit an active Program Library')
      return res.status(409).send({ error: 'Not allowed' })
    }
    const resourcesToSearch = ['ValueSet', 'PlanDefinition', 'Library']
    // question -- can we just search all resources for a version?

    const getTransactionBody: fhir4.BundleEntry[] = resourcesToSearch.map((resourceType) => {
      const url = `${resourceType}?version=${programVersion}`
      return ({
        request: {
          method: 'GET',
          url
        }
      })
    })
    // first, get all resources with the same version
    // search should probably be more specific
    const batchReqBundle: fhir4.Bundle & { type: 'transaction' } = {
      resourceType: 'Bundle',
      type: 'transaction',
      entry: getTransactionBody
    }
  
    const allOwned = await fhirCdrClient.transaction({
      body: batchReqBundle
    })

    console.log('allOwned: ', allOwned)
    // if the GET fails to get anything, this doesn't cause
    // operationOutcome... is there a way to force opOutcome behavior?
    const ownedResources = allOwned
      ?.entry?.map((i: any) => {
        return (i?.resource?.entry)?.flat()
          ?.map((r: any) => r?.resource)
          ?.filter((x: any) => Boolean(x))
      })
        
    if (!ownedResources.length) {
      return res.status(400).send({ error: `No owned resources found with version ${programVersion}` }) 
    }

    const resourcesToUpdate = ownedResources.map((resource: fhir4.ValueSet | fhir4.PlanDefinition | fhir4.Library) => {
      resource.experimental = isExperimental
      const url = `/${resource.resourceType}/${resource.id}`
      return ({
        resource: resource,
        request: {
          method: 'PUT',
          url
        }
      })
    })

    await fhirCdrClient.transaction({
      body: {
        resourceType: 'Bundle',
        type: 'transaction',
        entry: resourcesToUpdate
      }
    })

    return res.status(200).send({})


  } catch (e: any) {
    const error = e as HapiError
    logSimpleError(error)
    return res.status(error?.response?.status || 500).json({ error: `Error changing ID` })
  }
}

export default handler({
  PUT: { action: updateOwnedResources }
})