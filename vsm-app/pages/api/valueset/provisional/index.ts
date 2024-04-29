import { PriorityLevelOption } from '@/components/ProgramValueSetDetails'
import { fhirCdrClient } from '@/fhirClients'
import { Condition } from '@/helpers/conditionHelpers'
import { is } from '@/helpers/is'
import { setVSConditions, setVSPriority, updateGrouperLeafs } from '@/helpers/libraryHelpers'
import { CreateProvisionalVs, addOrRemoveVsCodes, createProvisionalCodeSystem, generateProvisionalVs, updateCsCodes, updateVsMetadata } from '@/helpers/provisionalVsHelpers'
import handler from '@/helpers/server/handler'
import logger from '@/helpers/server/logger'
import type { NextApiRequest, NextApiResponse } from 'next'

interface Body extends CreateProvisionalVs {
  grouperIds: string[]
  programId: string
  updatedConditions: Condition[]
  updatedPriority: PriorityLevelOption
  provisionalVsIdForUpdate: string
}

interface ReqInfo extends NextApiRequest {
  body: Body
}

interface BuilderItem {
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

// // when the valueset is edited, must edit the underlying codeSystems if codes updated
// const createOrEditProvisionalValueSet = async (req: ReqInfo, res: NextApiResponse) => {
//   try {
//     const {
//       authorToUpdate,
//       stewardToUpdate,
//       titleToUpdate,
//       codesBySystemToAdd,
//       grouperIds,
//       programId,
//       updatedConditions,
//       provisionalVsIdForUpdate
//     } = req.body

//     if (!Object.keys(codesBySystemToAdd)?.length || !titleToUpdate || !grouperIds?.length) {
//       return res.status(400).json({ error: 'Invalid input. Endpoint requires the codes, title, and grouper IDs of the ValueSet being created.' })
//     }

//     let codeSystemToEdit
//     const systemUrls = Object.keys(codesBySystemToAdd)

//     const resourcesToSaveFirst = [] as BuilderItem[]
//     const resourcesToSaveLast = [] as BuilderItem[]

//     for (const systemUrl of systemUrls) {
//       // if provisional code system already exists, update the codesystem with any new items
//       const existingCS = await fhirCdrClient.search({
//         resourceType: 'CodeSystem',
//         searchParams: {
//           version: 'PROVISIONAL',
//           system: systemUrl
//         }
//       })

//       if (existingCS.entry) {
//         // edit existing codeSystem
//         codeSystemToEdit = existingCS.entry[0].resource
//         const updatedCS = updateCsCodes({ codeSystem: codeSystemToEdit, codeItems: codesBySystemToAdd[systemUrl], action: 'add' })
//         resourcesToSaveFirst.push({ resource: updatedCS, method: 'PUT' })
//       } else {
//         codeSystemToEdit = createProvisionalCodeSystem({
//           systemBaseUrl: systemUrl,
//           codeItems: codesBySystemToAdd[systemUrl]
//           // eventually add name in here to populate on codesystem
//         })
//         resourcesToSaveFirst.push({ resource: codeSystemToEdit, method: 'POST' })
//       }
//     }

//     let provisionalLeaf = {} as fhir4.ValueSet
//     if (provisionalVsIdForUpdate) {
//       // provisional vs already exists, get it from server
//       provisionalLeaf = await fhirCdrClient.read({
//         resourceType: 'ValueSet',
//         id: provisionalVsIdForUpdate
//       }) as fhir4.ValueSet

//       provisionalLeaf = updateVsMetadata({ authorToUpdate, stewardToUpdate, titleToUpdate, vsToUpdate: provisionalLeaf })
//       // remove codes to be removed, add codes to be added
//       if (codesBySystemToAdd) {
//         provisionalLeaf = addOrRemoveVsCodes(provisionalLeaf, codesBySystemToAdd, 'add')
//       }
//       // TODO update leaf as necessary
//     } else {
//       // first, create the value set
//       provisionalLeaf = generateProvisionalVs({
//         authorToUpdate,
//         stewardToUpdate,
//         titleToUpdate,
//         codesBySystemToAdd
//       }) as fhir4.ValueSet

//     }

//   resourcesToSaveFirst.push({ method: provisionalVsIdForUpdate ? 'PUT' : 'POST', existingId: provisionalVsIdForUpdate, resource: provisionalLeaf as fhir4.ValueSet })
  
//   const transactionBody = transactionBuilder(resourcesToSaveFirst)

//   const codeSysAndLeaf = await fhirCdrClient.transaction({
//     body: transactionBody
//   })

//   if (is.operationOutcome(codeSysAndLeaf)) {
//     return res.status(400).json({ error: 'Failed to create/update CodeSystem and ValueSet' })
//   }

//   const provisionalLeafId = codeSysAndLeaf.entry.map((e: any) => e.response.location)
//     .filter((loc: string) => loc.includes('ValueSet/'))[0]
//     .split('/')[1]
  
//     // if it's a new valueset, update the url to use the id instead of the name
//   if (!provisionalVsIdForUpdate) {
//     const leaf = await fhirCdrClient.read({
//       resourceType: 'ValueSet',
//       id: provisionalLeafId
//     }) as fhir4.ValueSet

//     // update url here
//     leaf.url = `${process.env.FHIR_CDR_URL}/ValueSet/${leaf.id}`
//     provisionalLeaf = leaf
//     // PUT to update leaf
//     resourcesToSaveLast.push({ method: 'PUT', resource: leaf })
//   }

//   if (updatedConditions) {
//     // update program with conditions
//     const program = await fhirCdrClient.read({
//       resourceType: 'Library',
//       id: programId
//     }) as fhir4.Library
  
//     const updatedProgram = setVSConditions(program, updatedConditions, [provisionalLeaf.url!], 'override')
//     resourcesToSaveLast.push({ method: 'PUT', resource: updatedProgram })
//   }
  
//   if (grouperIds) {
//     // get the associated groupers and update with the reference
//     const grouperReqItems = grouperIds?.map((id: string) => (
//       {
//         resourceType: 'ValueSet',
//         method: 'GET',
//         resourceId: id
//       }
//     ))

//     const getGrouperTransaction = transactionBuilder(grouperReqItems as BuilderItem[])

//     // handles the 'add' case
//     const allGroupersToUpdate = await fhirCdrClient.transaction({ body: getGrouperTransaction })

//     if (is.operationOutcome(allGroupersToUpdate)) {
//       return res.status(500).json({ error: `Failed to find groupers with IDs ${grouperIds.join(', ')}` })
//     }

//     // if groupers are all found, update their references with provisionalVS urls
//     const groupersToUpdate = allGroupersToUpdate.entry.map((i: fhir4.BundleEntry) => (
//       updateGrouperLeafs(i.resource as fhir4.ValueSet, [provisionalLeaf.url!], 'add').grouper
//     ))
    
//     groupersToUpdate.forEach((g: fhir4.ValueSet) => resourcesToSaveLast.push({ method: 'PUT', resource: g }))

//     const grouperUpdateTransaction = transactionBuilder(resourcesToSaveLast)

//     const updatedGroupers = await fhirCdrClient.transaction({ body: grouperUpdateTransaction })

//     if (is.operationOutcome(updatedGroupers)) {
//       return res.status(500).json({ error: `Failed to update grouper references to provisional value set` }) 
//     } else {
//       return res.status(200).send({ newId: provisionalLeafId })
//     }
//   }

//   } catch (e) {
//     logger.error(e)
//     res.status(400).json({ error: 'Creating Provisional Valueset failed' })
//   }
// }

interface GetBody {
  reference?: fhir4.CodeSystem['url']
}

interface ProvisionalReqGet  extends NextApiRequest {
  body: GetBody
}

const getProvisionalVs = async (req: ProvisionalReqGet, res: NextApiResponse) => {
  try {

    const {
      // reference will only exist if users searching for
      // a particular valueset system
      // https://build.fhir.org/valueset.html#:~:text=ValueSet.compose.include.system
      title,
      url
    } = req.query

   let searchParams = {
    _tag: 'vsm-authored',
    _sort: '-_lastUpdated',
    _count: 100,
    ...(title && { ['title:contains']: title }),
    ...(url && { ['url:contains']: url })
  }

    // ideally I wouldn't be doing this and would just be using a searchParam on
    // an extension that designates provisional?
    const allVsmOwnedVS = await fhirCdrClient.search({
      resourceType: 'ValueSet',
      searchParams
    })

    const results = allVsmOwnedVS?.entry?.map((e: any) => e?.resource) || [] as fhir4.ValueSet[]
    const provisionalLeafsOnly = results?.filter((r: any) => r.extension.find((e: any) => e.url.endsWith('vsm-test-extension')))
    return res.status(200).json(provisionalLeafsOnly || [])

  } catch (e) {
    logger.error(e)
    res.status(400).json({ error: 'Search for Provisional Value Sets Failed' })
  }
}


// when the valueset is edited, must edit the underlying codeSystems if codes updated
const createOrEditProvisionalValueSet2 = async (req: ReqInfo, res: NextApiResponse) => {
  try {
    const {
      author,
      title,
      steward,
      newCodeSystemItems,
      codesBySystemToAdd,
      updatedConditions,
      updatedPriority,
      provisionalVsIdForUpdate
    } = req.body

    if (!Object.keys(codesBySystemToAdd)) {
      return res.status(400).json({ error: 'Invalid input. Endpoint requires that there be codes to update.' })
    }

    // add new codeSystems if necessary
    
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
        codeSystemToEdit = createProvisionalCodeSystem({
          systemBaseUrl: systemUrl,
          codeItems: codesBySystemToAdd[systemUrl],
          name: newCodeSystemItems?.find(i => i.uri === systemUrl).label
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
    provisionalLeaf = leaf
    // PUT to update leaf
    resourcesToSaveLast.push({ method: 'PUT', resource: leaf })
  }

  const secondUpdateTransaction = transactionBuilder(resourcesToSaveLast)
  const updated = await fhirCdrClient.transaction({ body: secondUpdateTransaction })

      if (is.operationOutcome(updated)) {
      return res.status(500).json({ error: `Failed to update Provisional value set` }) 
    } else {
      return res.status(200).send({ newId: provisionalLeafId })
    }
  // if (updatedConditions) {
  //   // update program with conditions
  //   const program = await fhirCdrClient.read({
  //     resourceType: 'Library',
  //     id: programId
  //   }) as fhir4.Library
  
  //   const updatedProgram = setVSConditions(program, updatedConditions, [provisionalLeaf.url!], 'override')
  //   resourcesToSaveLast.push({ method: 'PUT', resource: updatedProgram })
  // }
  
  // if (grouperIds) {
  //   // get the associated groupers and update with the reference
  //   const grouperReqItems = grouperIds?.map((id: string) => (
  //     {
  //       resourceType: 'ValueSet',
  //       method: 'GET',
  //       resourceId: id
  //     }
  //   ))

  //   const getGrouperTransaction = transactionBuilder(grouperReqItems as BuilderItem[])

  //   // handles the 'add' case
  //   const allGroupersToUpdate = await fhirCdrClient.transaction({ body: getGrouperTransaction })

  //   if (is.operationOutcome(allGroupersToUpdate)) {
  //     return res.status(500).json({ error: `Failed to find groupers with IDs ${grouperIds.join(', ')}` })
  //   }

  //   // if groupers are all found, update their references with provisionalVS urls
  //   const groupersToUpdate = allGroupersToUpdate.entry.map((i: fhir4.BundleEntry) => (
  //     updateGrouperLeafs(i.resource as fhir4.ValueSet, [provisionalLeaf.url!], 'add').grouper
  //   ))
    
  //   groupersToUpdate.forEach((g: fhir4.ValueSet) => resourcesToSaveLast.push({ method: 'PUT', resource: g }))

  //   const grouperUpdateTransaction = transactionBuilder(resourcesToSaveLast)

  //   const updatedGroupers = await fhirCdrClient.transaction({ body: grouperUpdateTransaction })

  //   if (is.operationOutcome(updatedGroupers)) {
  //     return res.status(500).json({ error: `Failed to update grouper references to provisional value set` }) 
  //   } else {
  //     return res.status(200).send({ newId: provisionalLeafId })
  //   }
  // }

  } catch (e) {
    logger.error(e)
    res.status(400).json({ error: 'Creating Provisional Valueset failed' })
  }
}

export default handler({
  // POST: { action: createOrEditProvisionalValueSet, access: ['admin', 'editor'] },
  PUT: { action: createOrEditProvisionalValueSet2, access: ['admin', 'editor'] },
  GET: { action: getProvisionalVs, access: ['admin', 'editor'] },
})