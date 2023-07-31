import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient, terminologyClient } from 'fhirClients'
import {
  addExtensionToVs,
  addValueSetToGrouper,
  authoritativeSourceExtensionUrl,
  createGrouperWithMetadata,
  updateGrouperWithMetadata,
  removeValueSetFromGrouper,
  stringWithoutVersion
} from '@/helpers/valueSetHelpers'
import handler from '@/helpers/server/handler'
import { HapiError } from '@/types/hapiError'
import { FlatGrouperVSet, GrouperMetadata } from '@/types/grouperTypes'
import { updateConditions } from '@/helpers/conditionHelpers'
import { terminologyServerEndpoints } from 'fhirClientOptions'
import { logSimpleHapiError } from '@/helpers/server/simpleHapiError'
import { is } from '@/helpers/is'
import logger from '@/helpers/server/logger'
import { getGrouperLibraryCanonical } from '@/helpers/libraryHelpers'
import cloneDeep from 'lodash.clonedeep'
import uniqBy from 'lodash.uniqby'

export type ErrorResponse = {
  errorMessage: string
  resStatus: number
}

// ---------------------------------------------------------------------------------
// --------------------- ROUTE TO DELETE VSETS FROM EXISTING GROUPERS --------------
// ---------------------------------------------------------------------------------
const deleteVSetsFromGroupers = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const body = JSON.parse(req.body)
    const { vsCanonical, grouperCanonicals } = body

    const groupersToUpdate = []
    for (const grouperC of grouperCanonicals) {
      const grouperValueSetBundle = (await fhirCdrClient.search({
        resourceType: 'ValueSet',
        searchParams: {
          url: grouperC
        }
      })) as fhir4.Bundle

      // there is an issue in the sample data where grouper valuesets have the exact same url
      const grouperVsToUpdate = grouperValueSetBundle?.entry?.[0]?.resource as fhir4.ValueSet

      if (grouperVsToUpdate) {
        const updatedGrouper = removeValueSetFromGrouper(grouperVsToUpdate, vsCanonical)

        groupersToUpdate.push(updatedGrouper)
        await Promise.all(
          groupersToUpdate.map((grouperVs) =>
            fhirCdrClient.update({
              resourceType: 'ValueSet',
              id: grouperVs.id,
              body: grouperVs
            })
          )
        )
      }
    }
    return res.status(200).send(groupersToUpdate)
  } catch (e) {
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
  const body: BodyInfo = JSON.parse(req.body)

  // programId will always be a string
  const programId = req.query.id as string

  let { grouperVSets, grouperMetadata } = body
  grouperVSets = uniqBy(grouperVSets, 'selectedValueSet.id')
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
      sendError(program)
    }

    // ensure user-entered grouper VS ID is unique
    const isIdUnique = await checkForUniqueID(grouperMetadata.id)
    if (is.errorResponse(isIdUnique)) {
      sendError(isIdUnique)
    }

    // find any leaf matches that exist in our HAPI server
    // (these may or may not exist)
    const matchesInCqf = await getMatchingLeafsFromCQF(grouperVSets)
    if (is.errorResponse(matchesInCqf)) {
      sendError(matchesInCqf)
    }

    // update those cached leafs with newly added conditions (if any)
    const updatedValueSetsFromCache = addConditionsToCachedLeafs(matchesInCqf, grouperVSets)

    /**
     * Start Creating Payloads here as a Transaction Bundle to submit to CDR
     */
    const cqfUpdatesPayload = await submitUpdatesToCQF({
      updatedVS: updatedValueSetsFromCache,
      grouperVSets,
      matchesInCqf
    })

    if (is.errorResponse(cqfUpdatesPayload)) {
      logger.error(`Error found at location 'submitUpdatesToCQF':  ${JSON.stringify(cqfUpdatesPayload, null, 2)}`)
      return res.status(400).send('Error with creating grouper valuesets')
    }

    const leafReferencesToAdd = cqfUpdatesPayload?.map((i: any) => i?.resource?.url) || []
    const grouperToSubmitPayload = createAndSubmitGrouper(leafReferencesToAdd, grouperMetadata)
    const grouperVsUrl = `${grouperToSubmitPayload?.resource?.url}|${grouperToSubmitPayload?.resource?.version}`
    const programLibUpdatePayload = await updateProgramLibraryWithGrouperRef(program as fhir4.Library, grouperVsUrl, grouperMetadata)
    if (is.errorResponse(programLibUpdatePayload)) {
      sendError(programLibUpdatePayload)
    } else {
      const putRequestBundle: fhir4.Bundle & { type: 'transaction' } = {
        resourceType: 'Bundle',
        type: 'transaction',
        // @ts-ignore
        entry: [...cqfUpdatesPayload, grouperToSubmitPayload, programLibUpdatePayload]
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
const buildBatchVSPut = (vsets: fhir4.ValueSet[]): fhir4.BundleEntry[] => {
  return vsets.map((vs) => ({
    resource: vs,
    request: {
      method: 'PUT',
      url: `ValueSet/${vs.id}`
    }
  }))
}

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
    logSimpleHapiError(e, 'getProgram')
    return {
      errorMessage: `Program with id ${programId} not found.`,
      resStatus: 404
    }
  }
}

const checkForUniqueID = async (grouperId: fhir4.ValueSet['id']): Promise<Boolean | ErrorResponse> => {
  // check to make sure no vset exists with user-entered ID
  try {
    const existingVS = await fhirCdrClient.read({
      resourceType: 'ValueSet',
      id: grouperId!
    })

    // if vs with id already exists, error out
    if (existingVS) {
      return { resStatus: 409, errorMessage: `ValueSet with ID ${grouperId} already exists. Please enter a unique ID.` }
    }
  } catch (e: HapiError | any) {
    // 404 is what we want -- no existing resource with that ID
    if (e?.response?.status === 404) {
      return true
    } else {
      logSimpleHapiError(e, 'checkForUniqueId')
    }
  }
  return { resStatus: 409, errorMessage: `Server error occurred while checking existence of ValueSet with ID ${grouperId}.` }
}

const buildBatchSearchEntries = (grouperVSets: FlatGrouperVSet[]): fhir4.BundleEntry[] => {
  return grouperVSets.map((vs) => {
    const unversionedUrl = (vs.selectedValueSet.url!)?.split('-')?.
    return {
      request: {
        method: 'GET',
        url: `ValueSet?url=${unversionedUrl}&_sort=-version`
      }
    }
  })
}

type MatchesInCQF = fhir4.ValueSet[] | undefined | ErrorResponse

const getMatchingLeafsFromCQF = async (grouperVSets: FlatGrouperVSet[]): Promise<MatchesInCQF> => {
  try {
    const getRequestBundle: fhir4.Bundle & { type: 'batch' } = {
      resourceType: 'Bundle',
      type: 'batch',
      entry: buildBatchSearchEntries(grouperVSets)
    }

    const responsesFromCdrGet = await fhirCdrClient.batch({ body: getRequestBundle })
    // only get the first resource in each nested array, should be ordered by version
    // so first is most recent
    return responsesFromCdrGet?.entry?.map((i: any) => i?.resource?.entry?.[0]?.resource)?.filter((x: fhir4.ValueSet | undefined) => x)
  } catch (e: HapiError | any) {
    logSimpleHapiError(e, 'getMatchingLeafsFromCQF')
    return { resStatus: 400, errorMessage: 'Could not find batch ValueSets' }
  }
}

const addConditionsToCachedLeafs = (matchesInCqf: MatchesInCQF, grouperVSets: FlatGrouperVSet[]): fhir4.ValueSet[] | undefined => {
  if (!matchesInCqf || is.errorResponse(matchesInCqf)) return

  return matchesInCqf.map((cachedVS) => {
    const conditionsToAdd = grouperVSets
      .find((item) => stringWithoutVersion(item.selectedValueSet.url!) === cachedVS.url)
      ?.selectedConditions?.filter((x) => Boolean(x))
    // if user does not include conditions, just return unchanged vs
    if (!conditionsToAdd?.length) {
      return cachedVS
    }
    const vsWithConditions = updateConditions(cachedVS, conditionsToAdd, false)
    return vsWithConditions
  })
}

interface SubmitUpdatesToCQF {
  updatedVS: fhir4.ValueSet[] | undefined
  matchesInCqf: MatchesInCQF
  grouperVSets: FlatGrouperVSet[]
}

const submitUpdatesToCQF = async ({
  updatedVS,
  matchesInCqf,
  grouperVSets
}: SubmitUpdatesToCQF): Promise<fhir4.BundleEntry[] | [] | ErrorResponse> => {
  if (!updatedVS || !matchesInCqf || is.errorResponse(matchesInCqf)) {
    return []
  }
  const transactionEntries = buildBatchVSPut(updatedVS)
  const matchesInCqfUrls = matchesInCqf?.map((vs) => vs.url)
  // get from remote
  // identify leaf urls that were not already in CQF, as they need to be grabbed from term servers
  const urlsToAddFromRemote = grouperVSets
    ?.map((vs) => (vs.selectedValueSet.url!)?.split('-')?.[0])
    ?.filter((url) => !matchesInCqfUrls?.includes(url))
    ?.filter((item) => Boolean(item))

  // handle case where there might be no need to grab leafs from term servers
  if (!urlsToAddFromRemote.length) {
    return []
  }

  const vsToAddFromTermServer = grouperVSets.filter((flatVs) => {
    return urlsToAddFromRemote.includes(flatVs?.selectedValueSet?.url?.split('-')[0]!)
  })

  if (vsToAddFromTermServer) {
    for (const flatGrouperItem of vsToAddFromTermServer) {
      try {
        terminologyClient.setClient(flatGrouperItem?.selectedTerminologyServer as 'vsac' | 'ontoserverR4')
        const terminologyClientInstance = terminologyClient.getClient()
        // vsac appends version to the id, search by unversioned
        // must do a read operation to get whole valueset instead of subsetted
        const idWithoutVersion = stringWithoutVersion(flatGrouperItem.selectedValueSet.id!)
        const valueSetToAdd = await terminologyClientInstance?.read({
          resourceType: 'ValueSet',
          id: idWithoutVersion
        })

        // add optional conditions to valueset from term server (VSAC)
        const vsWithConditions = updateConditions(valueSetToAdd as fhir4.ValueSet, flatGrouperItem.selectedConditions, false)

        // add authoritativeSource to valueset
        // TODO should make this a helper now used in 2 files
        const authSrcUrl = terminologyServerEndpoints?.find(
          (grp) => grp.value.title.toLowerCase() === flatGrouperItem.selectedTerminologyServer.toLowerCase()
        )?.value?.url

        // handle if no matching authoritativeSource url
        const vsWithAuthSource = addExtensionToVs(vsWithConditions, authoritativeSourceExtensionUrl, authSrcUrl as string)

        const vsAddedToCache = {
          resource: vsWithAuthSource,
          request: {
            method: 'POST',
            url: 'ValueSet'
          }
        } as fhir4.BundleEntry

        transactionEntries.push(vsAddedToCache)
      } catch (e: HapiError | any) {
        logSimpleHapiError(e, 'submitLeafUpdatesFromTermServers')
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

const createAndSubmitGrouper = (leafReferencesToAdd: fhir4.ValueSet['url'][], grouperMetadata: GrouperMetadata) => {
  const newGrouper = createGrouperWithMetadata(grouperMetadata)
  const grouperWithLeafRefs = addValueSetToGrouper(newGrouper, leafReferencesToAdd as string[])

  return {
    resource: grouperWithLeafRefs,
    request: {
      method: 'PUT',
      url: `ValueSet/${grouperMetadata.id}`
    }
  }
}

const updateProgramLibraryWithGrouperRef = async (
  program: fhir4.Library,
  grouperRef: fhir4.ValueSet['url'],
  grouperMetadata: GrouperMetadata
): Promise<fhir4.BundleEntry | ErrorResponse> => {
  try {
    // only one relatedArtifact will be the vs library
    // this must always exist
    const vsLibUrlToUpdate = program?.relatedArtifact?.find((artifact) => {
      return artifact?.type === 'composed-of' && artifact?.resource?.includes('/Library/')
    })?.resource

    if (!is.string(vsLibUrlToUpdate) || !vsLibUrlToUpdate.length) {
      return { resStatus: 400, errorMessage: `Error saving Grouper ${grouperMetadata.id} to Program ${program.id}` }
    }

    // there is currently no version on the grouper library after clone...
    // how do we identify which is the right one if this is the case?
    const [url, version] = vsLibUrlToUpdate.split('|')

    // currently there will only be ONE vs library with this url with draft status
    // this will be changed in the future with updates to how CQF $draft works
    // for now have to use this uniqueness to target the right library, will need to update
    const vsLib = await fhirCdrClient.search({
      resourceType: 'Library',
      searchParams: {
        url,
        version,
        status: 'draft'
      }
    })

    if (!vsLib.entry) {
      return { resStatus: 404, errorMessage: `Could not find Library with url ${url}` }
    }

    // there will only be one result because only one draft allowed currently
    const libResource = vsLib.entry[0].resource as fhir4.Library

    if (!libResource.relatedArtifact) {
      libResource.relatedArtifact = []
    }

    libResource.relatedArtifact.push({
      type: 'composed-of',
      resource: grouperRef?.split('|')[0], // use unversioned
      extension:[
        {
          url: "http://hl7.org/fhir/StructureDefinition/crmi-isOwned",
          valueBoolean: true
        }
      ]

    })

    // at this point, the grouper's valueset library is updated, save & return 200 if success
    return {
      resource: libResource,
      request: {
        method: 'PUT',
        url: `Library/${libResource.id}`
      }
    } as fhir4.BundleEntry
  } catch (e: HapiError | any) {
    logSimpleHapiError(e, 'updateProgramLibraryWithGrouperRef')
    return { resStatus: 400, errorMessage: `Failed to create transaction payload for Program ${program.id}` }
  }
}

// ---------------------------------------------------------------------------------
// -------------------------- ROUTE TO UPDATE EXISTING GROUPER ---------------------
// ---------------------------------------------------------------------------------
const updateExistingGrouperMetadata = async (req: NextApiRequest, res: NextApiResponse) => {

  try {
    const body = JSON.parse(req.body)
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
    logSimpleHapiError(e)
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
