import type { NextApiRequest, NextApiResponse } from 'next'
import FhirClient from '@/backend/clients/FhirCdrClient'
import { editComposeInclude } from '@/helpers/libraryHelpers'
import handler from '@/helpers/server/handler'
import Logger from '@/helpers/server/logger'
import { splitCanonical } from '@/helpers/stringHelpers'
import { artifactIsOwned } from '@/helpers/ownedHelpers'
import { collectPlanDefinitionValueSetUrls } from '@/helpers/planDefinitionHelpers'

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
  const planDefinitionCanonical = splitCanonical(planDefinitionUrl || "")
  const planDefinitionSearchParams: Record<string, string> = { url: planDefinitionCanonical[0] }
  if (planDefinitionCanonical.length > 1) {
    planDefinitionSearchParams.version = planDefinitionCanonical[1]
  } else {
    // fail - without the version param we can't guarantee we're checking against the correct PlanDefinition
    const error = "Could not determine delete safety, PlanDefinition version could not be resolved: " + planDefinitionUrl
    Logger.getLogger().error(error)
    return res.status(400).send({ error })
  }
  const [grouperLib, manifestLib, grouperVs, planDefinitionSearch] = await
    Promise.all([
      FhirClient.getInstance().read({
        resourceType: 'Library',
        id: libraryId
      }) as Promise<fhir4.Library>,
      FhirClient.getInstance().read({
        resourceType: 'Library',
        id: manifestLibraryId
      }) as Promise<fhir4.Library>,
      FhirClient.getInstance().read({
        resourceType: 'ValueSet',
        id: editingInfo.vsId
      }) as Promise<fhir4.ValueSet>,
      FhirClient.getInstance().search({
        resourceType: 'PlanDefinition',
        searchParams: planDefinitionSearchParams
      }) as Promise<fhir4.Bundle>,])

  // Using $data-requirements denied every delete. Only the PlanDefinition's own references should block a delete:
  // eRSD wires its trigger groupers into nested action inputs, those are what we must consider.
  const planDefinition = planDefinitionSearch?.entry?.[0]?.resource as fhir4.PlanDefinition | undefined
  if (!planDefinition) {
    // fail closed - without the PlanDefinition we cannot tell a trigger grouper from a user's own
    const error = "Could not determine delete safety, couldn't resolve PlanDefinition: " + planDefinitionUrl
    Logger.getLogger().error(error)
    return res.status(400).send({ error })
  }

  if (collectPlanDefinitionValueSetUrls(planDefinition).has(splitCanonical(editingInfo.vsCanonical)[0])) {
    const error = "Grouper could not be deleted as it is referenced by: " + planDefinitionUrl
    Logger.getLogger().error(error)
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
    await FhirClient.getInstance().transaction({
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
    Logger.getLogger().info("'add' functionality not implemented on programs/[id]/grouper/library")
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
      return FhirClient.getInstance().search({
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
    access: ['admin', 'publisher', 'editor']
  }
})
