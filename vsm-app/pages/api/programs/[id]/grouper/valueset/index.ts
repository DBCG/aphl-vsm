import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient, terminologyClient } from 'fhirClients'
import {
  addExtensionToVs,
  addValueSetToGrouper,
  createGrouperWithMetadata,
  updateGrouperWithMetadata,
  removeValueSetFromGrouper,
  idWithoutVersion,
  urlWithoutVersion,
  addProfileToValueSet,
  EXTENSIONS,
  updateAuthSource
} from '@/helpers/valueSetHelpers'
import handler from '@/helpers/server/handler'
import { HapiError } from '@/types/hapiError'
import { FlatGrouperVSet, GrouperMetadata } from '@/types/grouperTypes'
import { terminologyServerEndpoints } from 'fhirClientOptions'
import { logSimpleError } from '@/helpers/server/simpleHapiError'
import { is } from '@/helpers/is'
import logger from '@/helpers/server/logger'
import { uniq, uniqBy } from 'lodash'
import { setVSConditions, setVSPriority } from '@/helpers/libraryHelpers'
import { getGrouperLibrary, getGrouperValuesets } from '../../details/valuesets'
import { ErrorItem } from '@/helpers/is'

export type ErrorResponse = {
  errorMessage: string
  resStatus: number
}

const syncUnversionedRef = (newRefsToAdd: string[], existingLeafRefsInGroupers: string[]): (string | ErrorItem)[] => {
  // new refs are unversioned when a grouper is created (we do not give the ability to set version on grouper create)
  // if a leaf already exists in the program that is versioned, the new ref should also share that version
  const uniqueExisitingLeafRefs = new Set(existingLeafRefsInGroupers) //remove duplicates for refs that are present in multiple groupers
  const newRefsToAddSet = new Set(newRefsToAdd)

  // Collect all urls that are matching in the new refs and existing refs
  for (const ref of uniqueExisitingLeafRefs) {
    const url = ref.toLowerCase().split('|')?.[0]
    if (newRefsToAddSet.has(url)) {
      newRefsToAddSet.add(ref)
      newRefsToAddSet.delete(url)
    }
  }

  return Array.from(newRefsToAddSet)
}

const formatTransactionSearchEntry = (items: any): fhir4.Bundle & { type: 'transaction' } => {
  const grouperIds = Array.from(new Set(Object.values(items).flat()))

  const itemsToGet = grouperIds.map((id) => ({
    request: {
      method: 'GET',
      url: `ValueSet/${id}`
    } as fhir4.BundleEntryRequest
  }))

  return {
    resourceType: 'Bundle',
    type: 'transaction',
    entry: itemsToGet
  }
}

export const formatBatchGrouperUpdate = (groupers: fhir4.ValueSet[]): fhir4.Bundle & { type: 'transaction' } => {
  const itemsToUpdate = groupers.map((grouper) => ({
    request: {
      method: 'PUT',
      url: `ValueSet/${grouper.id}`
    } as fhir4.BundleEntryRequest,
    resource: grouper as fhir4.ValueSet
  }))

  return {
    resourceType: 'Bundle',
    type: 'transaction',
    entry: itemsToUpdate
  }
}

const removeValueSetFromLibrary = async (programId: string, valuesetUrls: string[]) => {
  const program = (await fhirCdrClient.read({
    resourceType: 'Library',
    id: programId
  })) as fhir4.Library
  if (!program) {
    logger.error(`Could not find Program: ${programId}`)
    throw new Error('Could not find Program: ' + programId)
  }

  program.relatedArtifact = program.relatedArtifact?.filter((artifact) => {
    if (artifact.type === 'depends-on' && artifact.extension?.[0]?.url?.endsWith('vsm-valueset-priority')) {
      return !valuesetUrls.includes(artifact.resource!)
    }
    return true
  })

  return {
    resource: program,
    request: {
      method: 'PUT',
      url: `Library/${program.id}`
    }
  } as fhir4.BundleEntry
}

// ---------------------------------------------------------------------------------
// --------------------- ROUTE TO DELETE VSETS FROM EXISTING GROUPERS --------------
// ---------------------------------------------------------------------------------
const deleteVSetsFromGroupers = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const programId = req.query.id as string
    const body = await req.body
    // if you are deleting valuesets from groupers in a batch...
    if (body.batchDelete) {
      try {
        const { batchDelete } = body
        const searchInput = formatTransactionSearchEntry(batchDelete)

        // grab all the groupers that need to be updated from CQF
        const grouperBatchEntryToUpdate = await fhirCdrClient.transaction({
          body: searchInput
        })

        if (is.operationOutcome(grouperBatchEntryToUpdate)) {
          // send failure response
          return res.status(400).send({ error: 'Error finding groupers to update' })
        }

        // just return the valueSet resource itself
        const grouperList = grouperBatchEntryToUpdate.entry.map((i: any) => i.resource)

        const updatedGroupers = grouperList.map((g: any) => {
          const allVsUrlsToDelete = Object.keys(batchDelete)
          return removeValueSetFromGrouper(g, allVsUrlsToDelete)
        })

        if (updatedGroupers.find((g: any) => g == null)) {
          return res.status(400).send({ error: 'Error removing Valueset(s) from grouper' })
        }

        const updateInput = formatBatchGrouperUpdate(updatedGroupers)

        const programUpdateJob = await removeValueSetFromLibrary(programId, Object.keys(batchDelete))

        if (programUpdateJob && updateInput?.entry) {
          updateInput.entry.push(programUpdateJob)
        }

        let updateGroupers
        try {
          updateGroupers = await fhirCdrClient.transaction({
            body: updateInput
          })
        } catch (e) {
          logSimpleError(e)
          return res.status(400).send({ error: 'Error encountered while deleting Valuesets from grouper references' })
        }

        if (is.operationOutcome(updateGroupers)) {
          // send failure response
          logger.error('error: ', updateGroupers)
          return res.status(400).send({ error: 'Error removing Valuesets from groupers' })
        }
        return res.status(200).send({})
      } catch (e) {
        logger.error('error: ', JSON.stringify(e))
        return res.status(400).send({ error: 'Error deleting Valuesets from groupers' })
      }

      // otherwise, you are deleting vsets one by one
    } else {
      try {
        const { vsCanonical, grouperInfo } = JSON.parse(`${body}`)
        const groupersToUpdate = []
        for (const grouperC of grouperInfo) {
          const grouperValueSetBundle = (await fhirCdrClient.search({
            resourceType: 'ValueSet',
            searchParams: {
              url: grouperC.canonical,
              _id: grouperC.id
            }
          })) as fhir4.Bundle

          // there is an issue in the sample data where grouper valuesets have the exact same url
          const grouperVsToUpdate = grouperValueSetBundle?.entry?.[0]?.resource as fhir4.ValueSet

          if (grouperVsToUpdate) {
            const updatedGrouper = removeValueSetFromGrouper(grouperVsToUpdate, [vsCanonical])
            groupersToUpdate.push(updatedGrouper)
            await Promise.all(
              groupersToUpdate.map((grouperVs) =>
                fhirCdrClient.update({
                  resourceType: 'ValueSet',
                  id: grouperVs!.id,
                  body: grouperVs as fhir4.ValueSet
                })
              )
            )
          }
        }
        return res.status(200).send(groupersToUpdate)
      } catch (e) {
        logSimpleError(e)
        res.status(400).send({ error: 'Error deleting grouper' })
      }
    }
  } catch (e) {
    console.error(e)
    logger.error('error: ', e)
    res.status(400).send({ error: 'error' })
  }
}

interface BodyInfo {
  grouperVSets: FlatGrouperVSet[]
  grouperMetadata: GrouperMetadata
}

// ---------------------------------------------------------------------------------
// -------------------------- ROUTE TO ADD NEW GROUPER -----------------------------
// ---------------------------------------------------------------------------------
const createGrouperValueSet = async (req: NextApiRequest, res: NextApiResponse): Promise<any> => {
  const body: BodyInfo = req.body

  // programId will always be a string
  const programId = req.query.id as string

  let { grouperVSets: groupersToUpdate, grouperMetadata } = body
  groupersToUpdate = uniqBy(groupersToUpdate, 'selectedValueSet.id')

  try {
    // fn to return out of API with error
    const sendError = (error: ErrorResponse) => {
      const { errorMessage } = error
      logger.error(`Error`, errorMessage)
      throw new Error(errorMessage)
    }

    // get program
    const program = await getProgram(programId)
    if (is.errorResponse(program)) {
      return sendError(program)
    }

    const grouperLib = await getGrouperLibrary(program)
    if (is.errorItem(grouperLib)) {
      return sendError({ errorMessage: grouperLib?.error, resStatus: 400 })
    }

    const allExistingGrouperVS = await getGrouperValuesets(grouperLib)
    if (is.errorItem(allExistingGrouperVS)) {
      return sendError({ errorMessage: allExistingGrouperVS.error, resStatus: 400 })
    }
    // get the list of all leaf refs in all groupers
    const allExistingLeafRefs = allExistingGrouperVS.flatMap((vs) => {
      const refsInGrouper = vs?.compose?.include?.filter((i) => !!i?.valueSet?.[0])?.map((i) => i.valueSet?.[0]!) || []
      return refsInGrouper
    })

    // find any leaf matches that exist in our HAPI server
    // (these may or may not exist)
    const matchesInServer = await getMatchingLeafsFromServer(groupersToUpdate)
    if (is.errorResponse(matchesInServer)) {
      sendError(matchesInServer)
    }

    /**
     * Start Creating Payloads here as a Transaction Bundle to submit to CDR
     */
    const serverUpdatesPayload = await generateTransactionBundleEntriesToAddMissingValueSetsToServer({
      grouperVSets: groupersToUpdate,
      matchesInServer: matchesInServer
    })

    if (is.errorResponse(serverUpdatesPayload)) {
      logger.error(
        `Error found at location 'generateTransactionBundleEntriesToAddMissingValueSetsToServer':  ${JSON.stringify(
          serverUpdatesPayload,
          null,
          2
        )}`
      )
      return res.status(400).send('Error with creating grouper valuesets')
    }

    const newValueSetsToBeAddedFromTermServer =
      serverUpdatesPayload
        ?.filter((entry) => entry?.resource?.resourceType === 'ValueSet')
        .map((entry) => entry.resource as fhir4.ValueSet)
        ?.map((i) => i.url)
        ?.filter((x) => !!x)
        .map((x) => x!) || []
    const existingVsToUpdate = Array.isArray(matchesInServer)
      ? matchesInServer
        ?.map((m) => m.url)
        ?.filter((x) => !!x)
        ?.map((x) => x!)
      : []
    // if a versioned leaf reference exists in another grouper, we need to ensure that we are adding that versioned url
    // we should only have 1 version of a leaf valueset in a program at any given time
    const leafReferencesToAdd = syncUnversionedRef([...newValueSetsToBeAddedFromTermServer, ...existingVsToUpdate], allExistingLeafRefs)
    const versionErrors = leafReferencesToAdd?.filter((i) => is.errorItem(i))
    if (versionErrors.length) {
      return res.status(400).send(versionErrors.map((e) => typeof e !== 'string' && e.error).join(', '))
    }
    const newGrouper = await createAndSaveGrouper(leafReferencesToAdd as string[], grouperMetadata)

    if (is.operationOutcome(newGrouper)) {
      return res.status(400).send('Error creating new grouper valueset')
    }
    const grouperVsUrl = `${newGrouper?.url}|${newGrouper?.version}`

    // Set Conditions onto the program library
    let modifiedProgram = program as fhir4.Library
    groupersToUpdate.forEach((vs) => {
      // these leaf valuesets are set to the latest version and will not have a version in their canonical url
      modifiedProgram = setVSConditions(modifiedProgram, vs.selectedConditions, [vs.selectedValueSet.url!], 'add')
      modifiedProgram = setVSPriority(modifiedProgram, vs.selectedPriority, [vs.selectedValueSet.url!])
    })

    // add default grouper priority (routine) to the top-level spec library
    modifiedProgram = setVSPriority(modifiedProgram, 'routine', [grouperVsUrl])

    const rctcProgramLibUpdatePayload = await updateProgramLibraryWithGrouperRef(modifiedProgram as fhir4.Library, grouperVsUrl)

    if (is.errorResponse(rctcProgramLibUpdatePayload)) {
      sendError(rctcProgramLibUpdatePayload)
    } else {
      const putRequestBundle: fhir4.Bundle & { type: 'transaction' } = {
        resourceType: 'Bundle',
        type: 'transaction',
        entry: [
          ...serverUpdatesPayload,
          rctcProgramLibUpdatePayload,
          {
            resource: modifiedProgram,
            request: {
              method: 'PUT',
              url: `Library/${modifiedProgram.id}`
            }
          }
        ]
      }
      const responsesFromTransaction = await fhirCdrClient.transaction({ body: putRequestBundle })
      return res.status(200).send({ message: responsesFromTransaction })
    }
  } catch (e: string | any) {
    logger.error(e)
    return res.status(400).send({ error: `${JSON.stringify(e)} | 'Failed to create Grouper ValueSet'` })
  }
}

// ---------------------------------------------------------------------------------
// ---------------------- HELPER FUNCTIONS USED IN ROUTES --------------------------
// ---------------------------------------------------------------------------------

const getProgram = async (programId: fhir4.Library['id']): Promise<fhir4.Library | ErrorResponse> => {
  try {
    const program = await fhirCdrClient.read({
      resourceType: 'Library',
      id: programId!
    })

    if (program.status !== 'draft') {
      return { errorMessage: 'Only programs with draft status may be edited', resStatus: 405 }
    } else if (!is.library(program)) {
      return { errorMessage: `Could not find program with id ${programId}`, resStatus: 404 }
    } else {
      return program
    }
  } catch (e: HapiError | any) {
    logSimpleError(e, 'getProgram')
    return {
      errorMessage: `Program with id ${programId} not found.`,
      resStatus: 404
    }
  }
}

const buildBatchSearchEntries = (grouperVSets: FlatGrouperVSet[]): fhir4.BundleEntry[] => {
  return grouperVSets.map((vs) => {
    const unversionedUrl = urlWithoutVersion(vs.selectedValueSet.url!)
    return {
      request: {
        method: 'GET',
        url: `ValueSet?url=${unversionedUrl}&_sort=-version`
      }
    }
  })
}

type MatchesInServer = fhir4.ValueSet[] | ErrorResponse

const getMatchingLeafsFromServer = async (grouperVSets: FlatGrouperVSet[]): Promise<MatchesInServer> => {
  try {
    const getRequestBundle: fhir4.Bundle & { type: 'batch' } = {
      resourceType: 'Bundle',
      type: 'batch',
      entry: buildBatchSearchEntries(grouperVSets)
    }

    const batchSearchResponseBundleOfBundles = (await fhirCdrClient.batch({ body: getRequestBundle })) as fhir4.Bundle
    return (
      batchSearchResponseBundleOfBundles?.entry
        ?.filter((outerBundleEntry) => outerBundleEntry.resource?.resourceType === 'Bundle')
        ?.map((outerBundleEntry) => outerBundleEntry.resource as fhir4.Bundle)
        // only get the first resource in each nested array, should be ordered by version
        // so first is most recent
        ?.map((innerBundle) => innerBundle.entry?.[0])
        ?.map((innerBundleEntry) => innerBundleEntry?.resource)
        ?.filter((resource) => resource?.resourceType === 'ValueSet')
        ?.map((resource) => resource as fhir4.ValueSet) || []
    )
  } catch (e: HapiError | any) {
    logSimpleError(e, 'getMatchingLeafsFromCQF')
    return { resStatus: 400, errorMessage: 'Could not find batch ValueSets' }
  }
}

interface FormatCqfUpdateTransactionBundle {
  matchesInServer: MatchesInServer
  grouperVSets: FlatGrouperVSet[]
}

const generateTransactionBundleEntriesToAddMissingValueSetsToServer = async ({
  matchesInServer,
  grouperVSets
}: FormatCqfUpdateTransactionBundle): Promise<fhir4.BundleEntry[] | ErrorResponse> => {
  // why error out if there are no matches??
  if (is.errorResponse(matchesInServer)) {
    return []
  }
  const transactionEntries: fhir4.BundleEntry[] = []
  const matchesInCqfUrls = matchesInServer?.map((vs) => vs.url)
  // get from remote
  // identify leaf urls that were not already in CQF, as they need to be grabbed from term servers
  const urlsToAddFromRemote = grouperVSets
    ?.map((vs) => urlWithoutVersion(vs.selectedValueSet.url!))
    ?.filter((url) => !matchesInCqfUrls?.includes(url))
    ?.filter((item) => Boolean(item))

  // handle case where there might be no need to grab leafs from term servers
  if (!urlsToAddFromRemote.length) {
    return []
  }

  const vsToAddFromTermServer = grouperVSets.filter((flatVs) => {
    return urlsToAddFromRemote.includes(urlWithoutVersion(flatVs?.selectedValueSet?.url!))
  })

  if (vsToAddFromTermServer) {
    for (const flatGrouperItem of vsToAddFromTermServer) {
      try {
        terminologyClient.setClient(flatGrouperItem?.selectedTerminologyServer)
        const terminologyClientInstance = terminologyClient.getClient()
        // vsac appends version to the id, search by unversioned
        // must do a read operation to get whole valueset instead of subsetted
        const idNoVersion = idWithoutVersion(flatGrouperItem.selectedValueSet.id!)
        const valueSetToAdd = await terminologyClientInstance?.read({
          resourceType: 'ValueSet',
          id: idNoVersion
        })

        // add authoritativeSource to valueset
        // TODO should make this a helper now used in 2 files
        const authSrcUrl = terminologyServerEndpoints?.find(
          (grp) => grp.value.title.toLowerCase() === flatGrouperItem.selectedTerminologyServer.toLowerCase()
        )?.value?.url

        // handle if no matching authoritativeSource url
        const vsWithAuthSource = addExtensionToVs(
          valueSetToAdd as fhir4.ValueSet,
          EXTENSIONS.AUTH_SOURCE_EXTENSION_URL,
          authSrcUrl as string
        )
        const updatedVSWithAuthSource = addProfileToValueSet(vsWithAuthSource)
        const vsAddedToCache: fhir4.BundleEntry = {
          resource: updatedVSWithAuthSource,
          request: {
            method: 'POST',
            url: 'ValueSet'
          }
        }

        transactionEntries.push(vsAddedToCache)
      } catch (e: HapiError | any) {
        logSimpleError(e, 'submitLeafUpdatesFromTermServers')
        return {
          resStatus: 400,
          errorMessage: `Error saving ValueSet '${flatGrouperItem.selectedValueSet.name}' from terminology server ${flatGrouperItem.selectedTerminologyServer}`
        }
      }
    }
  }
  // if all the updates were successful, return the urls updated
  return transactionEntries
}

const createAndSaveGrouper = async (leafReferencesToAdd: fhir4.ValueSet['url'][], grouperMetadata: GrouperMetadata) => {
  const newGrouper = createGrouperWithMetadata(grouperMetadata)
  const grouperWithLeafRefs = addValueSetToGrouper(newGrouper, leafReferencesToAdd as string[])
  // create the original grouper valueset
  const result = await fhirCdrClient.create({
    resourceType: 'ValueSet',
    body: grouperWithLeafRefs
  })

  if (result.resourceType === 'ValueSet') {
    // the authoritative source can't be updated until the grouper exists in the server
    // because you need to know the actual location with ID
    const updatedXt = updateAuthSource(result.extension || [], result.id)
    result.extension = updatedXt

    const resultWithCorrectAuthoritativeSource = await fhirCdrClient.update({
      resourceType: 'ValueSet',
      id: result.id,
      body: result
    })
    return resultWithCorrectAuthoritativeSource
  } else {
    return result
  }
}

const updateProgramLibraryWithGrouperRef = async (
  program: fhir4.Library,
  grouperRef: fhir4.ValueSet['url']
): Promise<fhir4.BundleEntry | ErrorResponse> => {
  try {
    // only one relatedArtifact will be the vs library
    // this must always exist
    const vsLibUrlToUpdate = program?.relatedArtifact?.find((artifact) => {
      return artifact?.type === 'composed-of' && artifact?.resource?.includes('/Library/')
    })?.resource

    if (!is.string(vsLibUrlToUpdate) || !vsLibUrlToUpdate.length) {
      return { resStatus: 400, errorMessage: `Error saving Grouper ${grouperRef} to Program ${program.id}` }
    }

    const [url, version] = vsLibUrlToUpdate.split('|')

    const vsLib = await fhirCdrClient.search({
      resourceType: 'Library',
      searchParams: {
        url,
        version,
        status: 'draft'
      }
    })

    if (!vsLib.entry) {
      return { resStatus: 404, errorMessage: `Could not find Library with url ${url} and version ${version}` }
    }

    // there will only be one result because only one draft allowed currently
    const valueSetLibrary = vsLib.entry[0].resource as fhir4.Library

    if (!valueSetLibrary.relatedArtifact) {
      valueSetLibrary.relatedArtifact = []
    }

    valueSetLibrary.relatedArtifact.push({
      type: 'composed-of',
      resource: grouperRef,
      extension: [
        {
          url: 'http://hl7.org/fhir/StructureDefinition/crmi-isOwned',
          valueBoolean: true
        }
      ]
    })

    // at this point, the grouper's valueset library is updated, save & return 200 if success
    return {
      resource: valueSetLibrary,
      request: {
        method: 'PUT',
        url: `Library/${valueSetLibrary.id}`
      }
    } as fhir4.BundleEntry
  } catch (e: HapiError | any) {
    logSimpleError(e, 'updateProgramLibraryWithGrouperRef')
    return { resStatus: 400, errorMessage: `Failed to create transaction payload for Program ${program.id}` }
  }
}

// ---------------------------------------------------------------------------------
// -------------------------- ROUTE TO UPDATE EXISTING GROUPER ---------------------
// ---------------------------------------------------------------------------------
const updateExistingGrouperMetadata = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const body = req.body
    const { grouperId, originalGrouperVersion, metadata } = body

    // there should only be one result here if any
    // matching particular vs id and version
    const originalVsBundle = await fhirCdrClient.search({
      resourceType: 'ValueSet',
      searchParams: {
        _id: grouperId,
        version: originalGrouperVersion,
        status: 'draft'
      }
    })

    if (!originalVsBundle.entry) {
      logger.error(`Could not find grouper valueset with ID ${grouperId} and version ${originalGrouperVersion} to update.`)
      return res.status(404).send({ message: 'Grouper not found' })
    }

    const grouperToEdit = originalVsBundle.entry[0].resource

    if (grouperToEdit.status !== 'draft') {
      logger.error(`Edited resource must be a draft.`)
      return res.status(400).send({ message: 'Can only edit draft resources' })
    }

    const grouperToSubmit = updateGrouperWithMetadata({ vsToUpdate: grouperToEdit, metadata })

    const grouperUpdated = await fhirCdrClient.update({
      resourceType: 'ValueSet',
      body: grouperToSubmit,
      searchParams: {
        _id: grouperId
      }
    })

    if (is.operationOutcome(grouperUpdated)) {
      logger.error(`Update failed for grouper with ID ${grouperId}`)
      return res.status(500).send({ message: 'Error updating grouper' })
    }

    return res.status(200).send({ message: `Grouper ${grouperId} updated` })
  } catch (e) {
    logSimpleError(e, 'updateExistingGrouper')
    res.status(400).send({ error: 'error' })
  }
}

export default handler({
  DELETE: {
    action: deleteVSetsFromGroupers,
    access: ['admin', 'editor']
  },
  POST: {
    action: createGrouperValueSet,
    access: ['admin', 'editor']
  },
  PUT: {
    action: updateExistingGrouperMetadata,
    access: ['admin', 'editor']
  }
})
