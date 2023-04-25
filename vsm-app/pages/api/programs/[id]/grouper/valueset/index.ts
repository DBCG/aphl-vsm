import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient, terminologyClient } from 'fhirClients'
import {
  addExtensionToVs,
  addValueSetToGrouper,
  authoritativeSourceExtensionUrl,
  createGrouperWithMetadata,
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

export type ErrorResponse = {
  errorMessage: string
  resStatus: number
}

// ---------------------------------------------------------------------------------
// --------------------- ROUTE TO UPDATE EXISTING GROUPERS -------------------------
// ---------------------------------------------------------------------------------
const updateGroupers = async (req: NextApiRequest, res: NextApiResponse) => {
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

  const { grouperVSets, grouperMetadata } = body

  try {
    // fn to return out of API with error
    const sendError = (error: ErrorResponse) => {
      const { errorMessage } = error
      logger.error(`Error found at location ${location}`)
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

    const successfulUpdatesToCQF = await submitUpdatesToCQF({
      updatedVS: updatedValueSetsFromCache,
      grouperVSets,
      matchesInCqf
    })
    if (is.errorResponse(successfulUpdatesToCQF)) {
      sendError(successfulUpdatesToCQF)
    }

    const grouperSubmitted = await createAndSubmitGrouper(successfulUpdatesToCQF as string[], grouperMetadata)
    if (is.errorResponse(grouperSubmitted)) {
      sendError(grouperSubmitted)
    }

    const programLibUpdate = await updateProgramLibraryWithGrouperRef(program as fhir4.Library, grouperSubmitted as string, grouperMetadata)

    if (is.errorResponse(programLibUpdate)) {
      sendError(programLibUpdate)
    } else {
      return res.status(200).send({ message: programLibUpdate })
    }
  } catch (e: ErrorResponse | any) {
    return res.status(400).send(`${e?.errorMessage} | 'Failed to create Grouper ValueSet'`)
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
    const unversionedUrl = stringWithoutVersion(vs.selectedValueSet.url!)
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

    const responsesFromCdrGet = await fhirCdrClient.batch({
      body: getRequestBundle
    })
    // only get the first resource in each nested array, should be ordered by version
    // so first is most recent
    return responsesFromCdrGet?.entry?.map((i: any) => i?.resource?.entry?.[0]?.resource)?.filter((x: fhir4.ValueSet | undefined) => x)
  } catch (e: HapiError | any) {
    logSimpleHapiError(e, 'getMatchingLeafsFromCQF')
    return { resStatus: 400, errorMessage: 'Could not update ValueSets with new conditions' }
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
}: SubmitUpdatesToCQF): Promise<fhir4.ValueSet['url'][] | [] | ErrorResponse> => {
  let successfulUpdates = []
  try {
    if (!updatedVS || !matchesInCqf || is.errorResponse(matchesInCqf)) {
      return []
    }

    const batchEntries = buildBatchVSPut(updatedVS)

    const putRequestBundle: fhir4.Bundle & { type: 'batch' } = {
      resourceType: 'Bundle',
      type: 'batch',
      entry: batchEntries
    }

    const responsesFromCdrPut = await fhirCdrClient.batch({
      body: putRequestBundle
    })

    // match everything until the 2nd slash for error readout
    const regex = new RegExp('^[^/]+/[^/]+')

    const failedPuts = responsesFromCdrPut.entry
      ?.filter((res: fhir4.BundleEntry) => res?.response?.status !== '200 OK')
      ?.map((failure: fhir4.BundleEntry) => failure?.response?.location?.match(regex))

    // fail out if there  was an error in one of the PUTs
    if (failedPuts?.length) {
      return { resStatus: 400, errorMessage: `Could not update ValueSets: ${failedPuts.join(', ')}` }
    } else {
      const successfulUrls = updatedVS?.map((vs) => vs.url)
      // if no failures, track all urls of added leafs
      successfulUpdates = successfulUrls
    }
  } catch (e: HapiError | any) {
    logSimpleHapiError(e, 'submitUpdatesToCachedCQFVS')
    return { resStatus: 400, errorMessage: 'Error occurred while updating cached leaf valuesets' }
  }
  const matchesInCqfUrls = matchesInCqf?.map((vs) => vs.url)
  // get from remote
  // identify leaf urls that were not already in CQF, as they need to be grabbed from term servers
  const urlsToAddFromRemote = grouperVSets
    ?.map((vs) => stringWithoutVersion(vs.selectedValueSet.url!))
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

        const vsAddedToCache = await fhirCdrClient.create({
          resourceType: 'ValueSet',
          body: vsWithAuthSource
        })

        if (!vsAddedToCache) {
          return { resStatus: 400, errorMessage: `Error saving ValueSet: '${flatGrouperItem.selectedValueSet.name}'` }
        } else {
          successfulUpdates.push(vsWithAuthSource.url!)
        }
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
  return successfulUpdates
}

const createAndSubmitGrouper = async (
  leafReferencesToAdd: fhir4.ValueSet['url'][],
  grouperMetadata: GrouperMetadata
): Promise<fhir4.ValueSet['url'] | ErrorResponse> => {
  const newGrouper = createGrouperWithMetadata(grouperMetadata)
  const grouperWithLeafRefs = addValueSetToGrouper(newGrouper, leafReferencesToAdd as string[])

  try {
    const createdGrouper = await fhirCdrClient.update({
      resourceType: 'ValueSet',
      id: grouperMetadata.id,
      body: grouperWithLeafRefs
    })

    // return versioned grouper reference if successful
    return `${createdGrouper.url}|${createdGrouper.version}`
  } catch (e: HapiError | any) {
    logSimpleHapiError(e, 'createAndSubmitGrouper')
    return { resStatus: 400, errorMessage: `Error saving Grouper ${grouperMetadata.id}` }
  }
}

const updateProgramLibraryWithGrouperRef = async (
  program: fhir4.Library,
  grouperRef: fhir4.ValueSet['url'],
  grouperMetadata: GrouperMetadata
): Promise<string | ErrorResponse> => {
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
      resource: grouperRef?.split('|')[0] // should this be verisoned or unversioned
    })

    // at this point, the grouper's valueset library is updated, save & return 200 if success
    await fhirCdrClient.update({
      resourceType: 'Library',
      id: libResource.id,
      body: libResource
    })

    return `Saved new grouper ${libResource.id} to Program ${program.id}`
  } catch (e: HapiError | any) {
    logSimpleHapiError(e, 'updateProgramLibraryWithGrouperRef')
    return { resStatus: 400, errorMessage: `Failed to save changes to Program ${program.id}` }
  }
}

export default handler({
  PUT: {
    action: updateGroupers,
    access: ['admin', 'editor']
  },
  POST: {
    action: createGrouperValueSet,
    access: ['admin', 'editor']
  }
})
