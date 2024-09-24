import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from 'fhirClients'
import { editComposeInclude } from '@/helpers/libraryHelpers'
import handler from '@/helpers/server/handler'
import logger from '@/helpers/server/logger'
import { splitCanonical } from '@/helpers/stringHelpers'
import { artifactIsOwned } from '@/helpers/ownedHelpers'

interface EditingInfo {
  action: 'remove' | 'add'
  vsCanonical: string
  vsId: string
}

export interface DeleteGrouperRequest extends NextApiRequest {
  body: {
    grouperLibraryId: string
    manifestLibraryId: string
    planDefinitionUrl?: string
    editingInfo: EditingInfo
  }
}

const updateGrouperLibrary = async (req: DeleteGrouperRequest, res: NextApiResponse) => {
  const body = req.body

  const { grouperLibraryId: libraryId, editingInfo, manifestLibraryId, planDefinitionUrl }: DeleteGrouperRequest["body"] = body
  const urlParameters: fhir4.Parameters = {
    resourceType: "Parameters",
    parameter: [{
      name: "url",
      valueUri: planDefinitionUrl
    }]
  }
  const [grouperLib, manifestLib, grouperVs, planDefinitionDataRequirements] = await
    Promise.all([
      fhirCdrClient.read({
        resourceType: 'Library',
        id: libraryId
      }) as Promise<fhir4.Library>,
      fhirCdrClient.read({
        resourceType: 'Library',
        id: manifestLibraryId
      }) as Promise<fhir4.Library>,
      fhirCdrClient.read({
        resourceType: 'ValueSet',
        id: editingInfo.vsId
      }) as Promise<fhir4.ValueSet>,
      fhirCdrClient.operation({
        name: "$data-requirements",
        method: "POST",
        input: JSON.stringify(urlParameters)
      }) as Promise<fhir4.Library>,])

  const isGrouperPlanDefinitionDependency = planDefinitionDataRequirements.relatedArtifact?.some(ra => ra.resource && splitCanonical(ra.resource)[0] === editingInfo.vsCanonical)
  if (isGrouperPlanDefinitionDependency) {
    const error = "Grouper is dependency of: " + planDefinitionUrl
    logger.error(error)
    return res.status(400).send({ error })
  }

  if (editingInfo.action === 'remove') {
    const updatedGrouperLib = editComposeInclude({
      grouperLib,
      relatedArtifact: {
        url: editingInfo.vsCanonical
      },
      action: 'remove'
    })
    const otherGroupers = await groupersFromGrouperLib(updatedGrouperLib)

    // also need to remove all the depends-on references for the grouper and children
    // this is only an interim solution until we can get the update to $package to use $data-requirements, at which point we can use that to more easily keep the manifest updated while editing it
    manifestLib.relatedArtifact = manifestLib.relatedArtifact?.filter(ra => {
      if (
        ra.resource
        // remove if it points at the grouper valueset
        && splitCanonical(ra.resource)[0] !== editingInfo.vsCanonical
        // or if it has a reference to a leaf which is not in any other grouper
        && (!grouperVs.compose?.include?.find(include => splitCanonical(include?.valueSet?.[0] || "")[0] === splitCanonical(ra.resource || "")[0]) || otherGroupers.find(grouper => grouper?.compose?.include?.find(include => splitCanonical(include?.valueSet?.[0] || "")[0] === splitCanonical(ra.resource || "")[0])))
      ) {
        return true
      } else {
        return false
      }
    })
    // update the grouper library to delete the reference
    // to the grouper valueset
    await fhirCdrClient.transaction({
      body: {
        type: "transaction",
        resourceType: "Bundle",
        entry: [
          {
            resource: updatedGrouperLib,
            request: {
              method: "PUT",
              url: "Library/" + updatedGrouperLib.id
            }
          },
          {
            request: {
              method: "DELETE",
              url: "ValueSet/" + editingInfo.vsId
            }
          }, {
            resource: manifestLib,
            request: {
              method: "PUT",
              url: "Library/" + manifestLibraryId
            }
          }
        ]
      }
    }) as fhir4.Bundle

    return res.status(200).send(updatedGrouperLib)
  } else {
    logger.info("'add' functionality not implemented on programs/[id]/grouper/library")
    return res.status(400).send({ error: "'add' functionality not implemented on programs/[id]/grouper/library" })
  }
}

async function groupersFromGrouperLib(grouperLib: fhir4.Library) {
  return (await Promise.all(grouperLib.relatedArtifact
    ?.filter(ra => artifactIsOwned(ra) && ra.resource)
    ?.map(ra => ra.resource!)
    ?.map(url => {
      const urlAndMaybeVersion = splitCanonical(url)
      const searchParams: Record<string, string> = {
        url: urlAndMaybeVersion[0],
      }
      if (urlAndMaybeVersion.length > 1) {
        searchParams.version = urlAndMaybeVersion[1]
      }
      return fhirCdrClient.search({
        resourceType: "ValueSet",
        searchParams: searchParams
      })
    }) || []))
    .filter(res => res.resourceType === 'Bundle' && (res as fhir4.Bundle).entry?.length)
    .flatMap(res => (res as fhir4.Bundle).entry)
    .filter(entry => entry?.resource?.resourceType === 'ValueSet')
    .map(entry => entry?.resource as fhir4.ValueSet)
}

export default handler({
  PUT: {
    action: updateGrouperLibrary,
    access: ['admin', 'editor']
  }
})
