import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from 'fhirClients'
import { editComposeInclude } from '@/helpers/libraryHelpers'
import handler from '@/helpers/server/handler'
import { is } from '@/helpers/is'
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
    editingInfo: EditingInfo
  }
}

const updateGrouperLibrary = async (req: DeleteGrouperRequest, res: NextApiResponse) => {
  try {
    const body = req.body

    const { grouperLibraryId: libraryId, editingInfo, manifestLibraryId }: DeleteGrouperRequest["body"] = body

    const [grouperLib, manifestLib, grouperVs] = await
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
        }) as Promise<fhir4.ValueSet>])

    if (is.library(grouperLib) && editingInfo.action === 'remove') {
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
      const [updatedGrouperLibResponse, deletedGrouperVsResponse, updatedManifestLibResponse] = await Promise.all([fhirCdrClient.update({
        resourceType: 'Library',
        id: updatedGrouperLib.id,
        body: updatedGrouperLib
      }),
      // delete the actual grouper valueset
      // as these only exist in the context of the program
      fhirCdrClient.delete({
        resourceType: 'ValueSet',
        id: editingInfo.vsId
      }),
      // update the manifest library
      fhirCdrClient.update({
        resourceType: 'Library',
        id: manifestLib.id,
        body: manifestLib
      })])

      if (is.library(updatedGrouperLibResponse)) {
        // if deletion of the actual ValueSet failed, doesn't matter from FE perspective
        // because the connection is severed at the Library level, but still warn
        // as this will create orphaned ValueSets in the data
        if (!deletedGrouperVsResponse?.ok) {
          logger.error(`Failed to delete ValueSet ${editingInfo.vsId}`)
        }
        // this might be a problem?
        if (!is.library(updatedManifestLibResponse)) {
          logger.error(`Error updating manifest library ${manifestLib.id}`)
        }
        return res.status(200).send(updatedGrouperLibResponse)
      } else {
        logger.error(`Failed to update grouper lib ${grouperLib.name}`)
        return res.status(400).send({ error: 'Update failed' })
      }
    }
  } catch (e) {
    logger.error('error: ', e)
    res.status(400).send({ error: 'error' })
  }
}

async function groupersFromGrouperLib(grouperLib: fhir4.Library) {
  return (await Promise.all(grouperLib.relatedArtifact
    ?.filter(ra => artifactIsOwned(ra))
    ?.map(ra => {
      const urlAndMaybeVersion = splitCanonical(ra.resource || "")
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
