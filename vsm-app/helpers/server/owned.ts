import { fhirCdrClient } from '@/fhirClients'
import { HapiError } from '@/types/hapiError'
import { logSimpleError } from '@/helpers/server/simpleHapiError'
import { getOwnedCanonicals } from '@/helpers/ownedHelpers'

interface UpdateOwned {
  programId: string
  programVersion: string
  isExperimental: boolean
}

const updateOwnedResources = async ({ programId, programVersion, isExperimental }: UpdateOwned) => {
  try {

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
        return (i?.resource?.entry)
          ?.map((r: any) => r?.resource)
    }).flat()

    if (!resourcesWithMatchingVersion.length) {
      return ({ error: 'Did not find resources with matching version' })
    }

    // filter to make sure that each resource we got here is definitively
    // referenced by a parent as an owned item in relatedArtifact
    const programLib = resourcesWithMatchingVersion?.find((r: any) => r?.resourceType === 'Library' && r?.id === programId)
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

    const result = await fhirCdrClient.transaction({
      body: {
        resourceType: 'Bundle',
        type: 'transaction',
        entry: resourcesToUpdate
      }
    })

    return result

  } catch (e: any) {
    const error = e as HapiError
    logSimpleError(error)
    return ({ error: `Error occurred updating owned resources for program` })
  }
}

export default updateOwnedResources