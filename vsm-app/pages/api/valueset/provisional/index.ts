import { PriorityLevelOption } from '@/components/ProgramValueSetDetails'
import { fhirCdrClient, vsacFhirClient } from '@/fhirClients'
import { Condition } from '@/helpers/conditionHelpers'
import { is } from '@/helpers/is'
import { setVSConditions, setVSPriority, updateGrouperLeafs } from '@/helpers/libraryHelpers'
import {
  CreateProvisionalVs, addOrRemoveVsCodes, createProvisionalCodeSystem,
  generateProvisionalVs, updateCsCodes, updateVsMetadata
} from '@/helpers/provisionalVsHelpers'
import handler from '@/helpers/server/handler'
import logger from '@/helpers/server/logger'
import { logSimpleError } from '@/helpers/server/simpleHapiError'
import { addExtensionToVs, EXTENSIONS } from '@/helpers/valueSetHelpers'
import { SearchParams } from 'fhir-kit-client'
import type { NextApiRequest, NextApiResponse } from 'next'

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
    if (!Object.keys(codesBySystemToAdd)?.length || !title) {
      return res.status(400).json({ error: 'Invalid input. Endpoint requires the codes, title, and grouper IDs of the ValueSet being created.' })
    }

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
    leaf.url = `${process.env.FHIR_CDR_URL}/ValueSet/${leaf.id}`
    // update authoritative source here
    provisionalLeaf = addExtensionToVs(leaf, EXTENSIONS.AUTH_SOURCE_EXTENSION_URL, leaf.url)
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

export const getProvisionals = async ({ resourceType, params={} }: GetProvParams) => {
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
    return({ error: `Search for Provisional ${resourceType} Failed` })
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
    return res.status(500).json({ error: 'Error encountered finding Provisional Value Sets'})
  }
}

export default handler({
  POST: { action: createOrEditProvisionalValueSet, access: ['admin', 'editor'] },
  GET: { action: getProvisionalVs, access: ['admin', 'editor', 'reviewer'] },
})