import { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from '@/fhirClients'
import logger from '@/helpers/server/logger'
import handler from '@/helpers/server/handler'
import { HapiError } from '@/types/hapiError'
import { logSimpleError } from '@/helpers/server/simpleHapiError'
import { getOwnedCanonicals, getOwnedReferences } from '@/helpers/ownedHelpers'

const updateOwnedResources = async (req: NextApiRequest, res: NextApiResponse<{} | { error: string }>) => {
  try {
    const { programVersion, programStatus, isExperimental } = JSON.parse(req.body)
    if (programStatus === 'active') {
      logger.error('Cannot edit an active Program Library')
      return res.status(409).send({ error: 'Not allowed' })
    }
    const resourcesToSearch = ['ValueSet', 'PlanDefinition', 'Library']
    
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
    
    const versionMatches = await fhirCdrClient.transaction({
      body: batchReqBundle
    })

    const resourcesWithMatchingVersion = versionMatches
      ?.entry?.map((i: any) => {
        return (i?.resource?.entry)?.flat()
          ?.map((r: any) => r?.resource)
          ?.filter((item: any) => !Boolean(item))
    })

    if (!resourcesWithMatchingVersion.length) {
      return res.status(400).send({ error: `No owned resources found with version ${programVersion}` }) 
    }

    // filter to make sure that each resource we got here is definitively
    // referenced by a parent as an owned item in relatedArtifact
    const programLib = resourcesWithMatchingVersion?.find((r: any) => r?.resourcetype === 'Library' && r?.id === req.query.id)
    const ownedCanonicals = getOwnedCanonicals(programLib, resourcesWithMatchingVersion)

    const ownedResources = resourcesWithMatchingVersion.filter((res: fhir4.Library | fhir4.PlanDefinition | fhir4.ValueSet) => ownedCanonicals.includes(res.url!))

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
    return res.status(error?.response?.status || 500).json({ error: `Error occurred updating owned resources for program` })
  }
}

export default handler({
  PUT: { action: updateOwnedResources }
})