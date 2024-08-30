import { PriorityLevelOption } from '@/components/ProgramValueSetDetails'
import { fhirCdrClient, vsacFhirClient } from '@/fhirClients'
import { Condition } from '@/helpers/conditionHelpers'
import { is } from '@/helpers/is'
import { deleteValueSetReferencesFromLibrary, getGrouperLibraryCanonical, setVSConditions, setVSPriority, updateGrouperLeafs } from '@/helpers/libraryHelpers'
import {
  CreateProvisionalVs, addOrRemoveVsCodes, createProvisionalCodeSystem,
  generateProvisionalVs, updateCsCodes, updateVsMetadata
} from '@/helpers/provisionalVsHelpers'
import handler from '@/helpers/server/handler'
import logger from '@/helpers/server/logger'
import { logSimpleError } from '@/helpers/server/simpleHapiError'
import { addExtensionToVs, EXTENSIONS, removeValueSetFromGrouper, updateAuthSource } from '@/helpers/valueSetHelpers'
import { SearchParams } from 'fhir-kit-client'
import type { NextApiRequest, NextApiResponse } from 'next'
import { getGrouperLibrary, getGrouperValuesets } from '../../programs/[id]/details/valuesets'

interface Body extends CreateProvisionalVs {
  grouperIds: string[]
  programId: string
  updatedConditions: Condition[]
  updatedPriority: PriorityLevelOption
  provisionalVsIdForUpdate: string
  author: string
  title: string
  steward: string
}

interface ReqInfo extends NextApiRequest {
  body: Body
}

export interface BuilderItem {
  method: 'PUT' | 'POST' | 'GET'
  resource?: fhir4.ValueSet | fhir4.CodeSystem | fhir4.Library
  resourceId?: string
  resourceType?: string
  existingId?: string
}

// groupers need references to the actual provisional valueSet IDs...
// so the valuesets and their codeSystems need to be created before
// that step so they exist

const transactionBuilder = (items: BuilderItem[]): fhir4.Bundle & {
  type: 'transaction';
} => {
  const transactionEntry = items.map(i => {
    const resourceType = i?.resourceType || i?.resource?.resourceType as string
    const resourceId = i?.resourceId || i?.resource?.id as string
    // can't know the ID if the resource doesn't exist yet
    let url
    let resource
    if (i.method === 'PUT') {
      url = `${resourceType}/${resourceId}`
      resource = i.resource
    } else if (i.method === 'POST') {
      resource = i.resource
    } else if (i.method === 'GET') {
      url = `${resourceType}/${resourceId}`
    }

    let requestBody = {
      request: {
        method: i.method,
        ...(Boolean(url) && { url })
      },
      ...(Boolean(resource) && { resource })
    }
    return (requestBody)
  }) as fhir4.BundleEntry[]

  return ({
    resourceType: 'Bundle',
    type: 'transaction',
    entry: transactionEntry
  })

}

// when the valueset is edited, must edit the underlying codeSystems if codes updated
const createOrEditProvisionalValueSet = async (req: ReqInfo, res: NextApiResponse) => {
  try {
    const {
      author,
      steward,
      title,
      codesBySystemToAdd,
      grouperIds,
      programId,
      updatedConditions,
      updatedPriority,
      provisionalVsIdForUpdate
    } = req.body

    let codeSystemToEdit
    const systemUrls = Object.keys(codesBySystemToAdd)

    const resourcesToSaveFirst = [] as BuilderItem[]
    const resourcesToSaveLast = [] as BuilderItem[]

    for (const systemUrl of systemUrls) {
      // if provisional code system already exists, update the codesystem with any new items
      const existingCS = await fhirCdrClient.search({
        resourceType: 'CodeSystem',
        searchParams: {
          version: 'PROVISIONAL',
          system: systemUrl
        }
      })

      if (existingCS.entry) {
        // edit existing codeSystem
        codeSystemToEdit = existingCS.entry[0].resource
        const updatedCS = updateCsCodes({ codeSystem: codeSystemToEdit, codeItems: codesBySystemToAdd[systemUrl], action: 'add' })
        resourcesToSaveFirst.push({ resource: updatedCS, method: 'PUT' })
      } else {
        const codeSystemFromTermServer = await vsacFhirClient.search({
          resourceType: 'CodeSystem',
          searchParams: {
            status: 'active',
            _sort: 'latest',
            url: systemUrl,
            _count: 1
          }
        })

        const csName = codeSystemFromTermServer?.entry?.[0]?.resource?.name

        codeSystemToEdit = createProvisionalCodeSystem({
          systemBaseUrl: systemUrl,
          codeItems: codesBySystemToAdd[systemUrl],
          name: csName || 'No name provided'
        })
        resourcesToSaveFirst.push({ resource: codeSystemToEdit, method: 'POST' })
      }
    }

    let provisionalLeaf = {} as fhir4.ValueSet
    if (provisionalVsIdForUpdate) {
      // provisional vs already exists, get it from server
      provisionalLeaf = await fhirCdrClient.read({
        resourceType: 'ValueSet',
        id: provisionalVsIdForUpdate
      }) as fhir4.ValueSet

      provisionalLeaf = updateVsMetadata({ authorToUpdate: author, stewardToUpdate: steward, titleToUpdate: title, vsToUpdate: provisionalLeaf })
      // remove codes to be removed, add codes to be added
      if (codesBySystemToAdd) {
        provisionalLeaf = addOrRemoveVsCodes(provisionalLeaf, codesBySystemToAdd, 'add')
      }
      // TODO update leaf as necessary
    } else {
      // first, create the value set
      provisionalLeaf = generateProvisionalVs({
        authorToUpdate: author,
        stewardToUpdate: steward,
        titleToUpdate: title,
        codesBySystemToAdd
      }) as fhir4.ValueSet

    }

    resourcesToSaveFirst.push({ method: provisionalVsIdForUpdate ? 'PUT' : 'POST', existingId: provisionalVsIdForUpdate, resource: provisionalLeaf as fhir4.ValueSet })

    const transactionBody = transactionBuilder(resourcesToSaveFirst)

    const codeSysAndLeaf = await fhirCdrClient.transaction({
      body: transactionBody
    })

    if (is.operationOutcome(codeSysAndLeaf)) {
      return res.status(400).json({ error: 'Failed to create/update CodeSystem and ValueSet' })
    }

    const provisionalLeafId = codeSysAndLeaf.entry.map((e: any) => e.response.location)
      .filter((loc: string) => loc.includes('ValueSet/'))[0]
      .split('/')[1]

    // if it's a new valueset, update the url to use the id instead of the name
    if (!provisionalVsIdForUpdate) {
      const leaf = await fhirCdrClient.read({
        resourceType: 'ValueSet',
        id: provisionalLeafId
      }) as fhir4.ValueSet

      // update url here
      leaf.url = `${process.env.NEXT_PUBLIC_DEFAULT_PUBLISHING_URL}/ValueSet/${leaf.id}`
      // update authoritative source here
      provisionalLeaf.extension = updateAuthSource(leaf.extension || [], leaf.id!)
      // PUT to update leaf
      resourcesToSaveLast.push({ method: 'PUT', resource: leaf })
    }

    if (programId) {
      let program = await fhirCdrClient.read({
        resourceType: 'Library',
        id: programId
      }) as fhir4.Library

      if (updatedConditions) {
        // update program with conditions
        program = setVSConditions(program, updatedConditions, [provisionalLeaf.url!], 'override')
      }
      // always update priority, since it's required
      program = setVSPriority(program, updatedPriority.value, [provisionalLeaf.url!])
      resourcesToSaveLast.push({ method: 'PUT', resource: program })

      if (grouperIds) {
        // get the associated groupers and update with the reference
        const grouperReqItems = grouperIds?.map((id: string) => (
          {
            resourceType: 'ValueSet',
            method: 'GET',
            resourceId: id
          }
        ))

        const getGrouperTransaction = transactionBuilder(grouperReqItems as BuilderItem[])

        // handles the 'add' case
        const allGroupersToUpdate = await fhirCdrClient.transaction({ body: getGrouperTransaction })

        if (is.operationOutcome(allGroupersToUpdate)) {
          return res.status(500).json({ error: `Failed to find groupers with IDs ${grouperIds.join(', ')}` })
        }

        // if groupers are all found, update their references with provisionalVS urls
        const groupersToUpdate = allGroupersToUpdate.entry.map((i: fhir4.BundleEntry) => (
          updateGrouperLeafs(i.resource as fhir4.ValueSet, [provisionalLeaf.url!], 'add').grouper
        ))

        groupersToUpdate.forEach((g: fhir4.ValueSet) => resourcesToSaveLast.push({ method: 'PUT', resource: g }))

      }
    }
    const finalUpdates = transactionBuilder(resourcesToSaveLast)

    const updatedResources = await fhirCdrClient.transaction({ body: finalUpdates })
    if (is.operationOutcome(updatedResources)) {
      return res.status(500).json({ error: `Failed to update grouper references to provisional value set` })
    } else {
      return res.status(200).send({ newId: provisionalLeafId })
    }

  } catch (e) {
    logger.error(e)
    res.status(400).json({ error: 'Creating Provisional Valueset failed' })
  }
}

interface GetProvParams {
  resourceType: 'ValueSet' | 'CodeSystem'
  params: fhir4.SearchParameterComponent | {}
}

export const getProvisionals = async ({ resourceType, params = {} }: GetProvParams) => {
  if (!resourceType) return []
  try {

    const searchParams = Object.assign({
      _tag: 'vsm-provisional'
    }, params) as SearchParams


    const provisionalBundle = await fhirCdrClient.search({
      resourceType,
      searchParams
    })

    const allProvisionals = provisionalBundle?.entry?.map((e: any) => e?.resource) || [] as fhir4.ValueSet[] | fhir4.CodeSystem[]
    return allProvisionals

  } catch (e) {
    logger.error(e)
    return ({ error: `Search for Provisional ${resourceType} Failed` })
  }
}

const getProvisionalVs = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { title, url, codeSystemUrl, containsCode } = req.query
    const params = {
      ...(title && { 'title:contains': title }),
      ...(url && { 'url': url }),
      ...(codeSystemUrl && { 'reference': codeSystemUrl }),
      ...(containsCode && { 'code': containsCode }),
    }
    const results = await getProvisionals({ resourceType: 'ValueSet', params })
    if (results.error) {
      return res.status(400).send(results)
    }
    return res.status(200).json(results || [])
  } catch (e) {
    logSimpleError(e)
    return res.status(500).json({ error: 'Error encountered finding Provisional Value Sets' })
  }
}

const deleteProvisionalVs = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { id: provVsId, url: provVsUrl, programIdsToUpdate } = req.body
    let resourcesForBatchUpdate = []

    // if there are 
    if (programIdsToUpdate && programIdsToUpdate.length > 0) {
      let allUpdatedPrograms = [] as fhir4.Library[]
      let allUpdatedGroupers = [] as fhir4.ValueSet[]
      // if there are program IDs to update, must delete from program as well as groupers
      const programGetBatch = programIdsToUpdate.map((id: string) => {
        return {
          request: {
            resourceType: 'Library',
            url: `Library/${id}`,
            method: 'GET'
          }
        }
      })

      const transactionBody = {
        resourceType: 'Bundle',
        type: 'transaction',
        entry: programGetBatch
      }  as fhir4.Resource & { type: "transaction"; }

      const programTransactionResult = await fhirCdrClient.transaction({
        body: transactionBody
      })

      if (is.operationOutcome(programTransactionResult)) {
        return res.status(500).json({ error: `Failed to find programs with IDs ${programIdsToUpdate.join(', ')}` })
      } else {
        const errorExists = programTransactionResult?.entry?.map((response: any) => response?.response?.outcome?.issue)?.filter((x: any) => !!x)
        if (errorExists && errorExists.length > 0) {
          return res.status(500).json({ error: `Failed to find programs with IDs ${programIdsToUpdate.join(', ')}` })
        }
        allUpdatedPrograms = programTransactionResult.entry
          .map((i: fhir4.BundleEntry) => deleteValueSetReferencesFromLibrary(i.resource as fhir4.Library, [provVsUrl]))

      }

      const allGrouperValueSetsForAllPrograms = async (programs: fhir4.Library[]) => {
        let grouperValueSets = [] as fhir4.ValueSet[]

        for await (const program of programs) {
          const grouperLibrary = await getGrouperLibrary(program)
          if (is.errorItem(grouperLibrary)) {
            return res.status(500).json({ error: `Failed to find grouper library for program with ID ${program.id}` })
          } else {
            const grouperValueSetsForLibrary = await getGrouperValuesets(grouperLibrary)
            if (is.errorItem(grouperValueSetsForLibrary)) {
              return res.status(500).json({ error: `Failed to find groupers for program with ID ${program.id}` })
            }

            grouperValueSetsForLibrary.forEach((g: fhir4.ValueSet) => {
              const editedGrouper = removeValueSetFromGrouper(g, [provVsUrl])
              if (!editedGrouper) {
                return res.status(500).json({ error: `Failed to edit grouper with URL ${g.url}` })
              }
              grouperValueSets.push(editedGrouper)
            })
          }
        }
        return grouperValueSets
      }

      const allGroupers = await allGrouperValueSetsForAllPrograms(allUpdatedPrograms)
      allUpdatedGroupers = allGroupers?.filter((g: fhir4.ValueSet) => g) || []

      let putItems = [...allUpdatedPrograms, ...allUpdatedGroupers]

      let batchUpdates = putItems.map((r: fhir4.Library | fhir4.ValueSet) => {
        return {
          request: {
            method: 'PUT',
            url: `${r.resourceType}/${r.id}`,
          },
          resource: r
        }
      })

      // @ts-ignore
      batchUpdates.push({
        request: {
          method: 'DELETE',
          url: `ValueSet/${provVsId}`
        }
      })


      const updateTransaction = await fhirCdrClient.transaction({
        body: {
          resourceType: 'Bundle',
          type: 'transaction',
          entry: batchUpdates
        }
      })

      if (is.operationOutcome(updateTransaction)) {
        return res.status(500).json({ error: `Failed to update programs and groupers with Provisional ValueSet with ID ${provVsId}` })
      }
      return res.status(200).send({ message: `Provisional ValueSet with ID ${provVsId} deleted` })
    } else {
      // if no program IDs to update, just delete the provisional value set
      const result = await fhirCdrClient.delete({
        resourceType: 'ValueSet',
        id: provVsId
      })

      // successful deletes are operation outcomes, so need to check the response to see if error
      const hasFatalError = Boolean(
        is.operationOutcome(result)
        && (result?.issue?.filter((i: any) => i?.severity !== 'information')).length > 0
      )

      if (hasFatalError) {
        return res.status(500).json({ error: `Failed to delete Provisional ValueSet with ID ${provVsId}` })
      }
    }

    return res.status(200).json({ message: `Provisional ValueSet with ID ${provVsId} deleted` })
  } catch (e) {
    logSimpleError(e)
    return res.status(500).json({ error: 'Error encountered finding Provisional Value Sets' })
  }
}

export default handler({
  POST: { action: createOrEditProvisionalValueSet, access: ['admin', 'editor'] },
  DELETE: { action: deleteProvisionalVs, access: ['admin', 'editor'] },
  GET: { action: getProvisionalVs, access: ['admin', 'editor', 'reviewer'] },
})