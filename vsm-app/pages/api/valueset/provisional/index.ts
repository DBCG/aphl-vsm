import { fhirCdrClient } from '@/fhirClients'
import { is } from '@/helpers/is'
import { updateGrouperLeafs } from '@/helpers/libraryHelpers'
import { CreateProvisionalVs, createProvisionalCodeSystem, generateProvisionalVs, updateCsCodes } from '@/helpers/provisionalVsHelpers'
import handler from '@/helpers/server/handler'
import logger from '@/helpers/server/logger'
import type { NextApiRequest, NextApiResponse } from 'next'

interface Body extends CreateProvisionalVs {
  grouperIds: string[]
}

interface ReqInfo extends NextApiRequest {
  body: Body
}

interface BuilderItem {
  method: 'PUT' | 'POST' | 'GET'
  resource: fhir4.ValueSet | fhir4.CodeSystem
}


// groupers need references to the actual provisional valueSet IDs...
// so the valuesets and their codeSystems need to be created before
// that step so they exist

interface PutItem {
  method: 'PUT'
  resource: fhir4.CodeSystem | fhir4.ValueSet 
}

interface PostItem {
  method: 'POST'
  resource: fhir4.CodeSystem | fhir4.ValueSet 
}

interface GetItem {
  method: 'GET'
  resourceType: 'ValueSet' | 'CodeSystem'
  resourceId: string
}

type BuildItem = GetItem | PutItem | PostItem

const transactionBuilder = (items: BuilderItem[]): fhir4.Bundle & {
  type: 'transaction';
} => {
  const transactionEntry = items.map(i => {
    console.log('i: ', i)
    const resourceType = i?.resourceType || i?.resource?.resourceType as string
    const resourceId = i?.resourceId || i?.resource?.id as string
    let requestBody = {
      request: {
        method: i.method
      }
    }
    // can't know the ID if the resource doesn't exist yet
    if (i.method === 'PUT') {
      requestBody.request.url = `${resourceType}/${resourceId}`
      requestBody.resource = i.resource
    } else if (i.method === 'POST') {
      requestBody.resource = i.resource
    } else if (i.method === 'GET') {
      requestBody.request.url = `${resourceType}/${resourceId}`
    }
    return (requestBody)
  })

  console.log('transactionEntry: ', transactionEntry)
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
      authorToUpdate,
      stewardToUpdate,
      titleToUpdate,
      codesBySystemToAdd,
      grouperIds,
      provisionalVsIdForUpdate
    } = req.body

    console.log(codesBySystemToAdd)

    if (!Object.keys(codesBySystemToAdd)?.length || !titleToUpdate || !grouperIds?.length) {
      console.log('fail')
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

      console.log('here: ')
      if (existingCS.entry) {
        // edit existing codeSystem
        codeSystemToEdit = existingCS.entry[0].resource
        const updatedCS = updateCsCodes({ codeSystem: codeSystemToEdit, codeItems: codesBySystemToAdd[systemUrl], action: 'add' })
        resourcesToSaveFirst.push({ resource: updatedCS, method: 'PUT' })
      } else {
        codeSystemToEdit = createProvisionalCodeSystem({
          systemBaseUrl: systemUrl,
          codeItems: codesBySystemToAdd[systemUrl]
        })
        resourcesToSaveFirst.push({ resource: codeSystemToEdit, method: 'POST' })
      }
    }

    // console.log('resources to Update: ', resourcesToUpdate)
    let provisionalLeaf
    console.log('here 1')
    if (provisionalVsIdForUpdate) {
      console.log('here 2')
      // provisional vs already exists, get it from server
      provisionalLeaf = await fhirCdrClient.read({
        resourceType: 'ValueSet',
        id: provisionalVsIdForUpdate
      })
      // remove codes to be removed, add codes to be added
      console.log('here 3')
      // TODO update leaf as necessary
    } else {
      // first, create the value set
      provisionalLeaf = generateProvisionalVs({
        authorToUpdate,
        stewardToUpdate,
        titleToUpdate,
        codesBySystemToAdd
      }) as fhir4.ValueSet

    }
    resourcesToSaveFirst.push({ method: 'POST', resource: provisionalLeaf as fhir4.ValueSet })
  
  const transactionBody = transactionBuilder(resourcesToSaveFirst)
  // console.log('codeSystemsAndLeafs: ', codeSystemsAndLeafs.entry[1].request)

  const codeSysAndLeaf = await fhirCdrClient.transaction({
    body: transactionBody
  })

  if (is.operationOutcome(codeSysAndLeaf)) {
    return res.status(400).json({ error: 'Failed to create/update CodeSystem and ValueSet' })
  }

  console.log('codeSysandLeaf.entry: ', codeSysAndLeaf.entry[0].response.outcome)
  // const provisionalLeafItem = codeSysAndLeaf.entry.find(e => e.resource.resourceType === 'ValueSet') as fhir4.ValueSet
  // console.log('provisional leaf item: ', provisionalLeafItem)

  // return res.status(200).send({})
  // next, add all provisional valueset urls to the groupers
  if (grouperIds) {

    // get the associated groupers and update with the reference
    const grouperReqItems = grouperIds?.map((id: string) => (
      {
        resourceType: 'ValueSet',
        method: 'GET',
        resourceId: id
      }
    ))

    const getGrouperTransaction = transactionBuilder(grouperReqItems)

    // handles the 'add' case
    const allGroupersToUpdate = await fhirCdrClient.transaction({ body: getGrouperTransaction })
    console.log('all groupers: ', allGroupersToUpdate.entry[0].resource.compose.include)

    if (is.operationOutcome(allGroupersToUpdate)) {
      return res.status(500).json({ error: `Failed to find groupers with IDs ${grouperIds.join(', ')}` })
    }

    console.log('all gorupers: ', allGroupersToUpdate)
    // if groupers are all found, update their references with provisionalVS urls
    const groupersToUpdate = allGroupersToUpdate.entry.map((i: fhir4.BundleEntry) => (
      updateGrouperLeafs(i.resource as fhir4.ValueSet, [provisionalLeaf.url!], 'add').grouper
    ))
    
    groupersToUpdate.forEach((g: fhir4.ValueSet) => resourcesToSaveLast.push({ method: 'PUT', resource: g }))

    const grouperUpdateTransaction = transactionBuilder(resourcesToSaveLast)

    const updatedGroupers = await fhirCdrClient.transaction({ body: grouperUpdateTransaction })

    if (is.operationOutcome(updatedGroupers)) {
      return res.status(500).json({ error: `Failed to update grouper references to provisional value set` }) 
    } else {
      return res.status(200).send({})
    }
  }
  // next, send a fhir transaction to create/update the value set, codeSystem, and update the groupers
  

  } catch (e) {
    logger.error(e)
    res.status(400).json({ error: 'Creating Provisional Valueset failed' })
  }
}

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
      reference
    } = req.body

   let searchParams = {
    _tag: 'vsm-authored'
  }

    // ideally I wouldn't be doing this and would just be using a searchParam on
    // an extension that designates provisional?
    const allVsmOwnedVS = await fhirCdrClient.search({
      resourceType: 'ValueSet',
      searchParams
    })

    const results = allVsmOwnedVS?.entry?.map((e: any) => e?.resource) || [] as fhir4.ValueSet[]
    const provisionalLeafsOnly = results?.filter(r => r.extension.find(e => e.url.includes('vsm-test-extension')))

    return res.status(200).json(provisionalLeafsOnly || [])

  } catch (e) {
    logger.error(e)
    res.status(400).json({ error: 'Search for Provisional Value Sets Failed' })
  }
}

export default handler({
  POST: { action: createOrEditProvisionalValueSet, access: ['admin', 'editor'] },
  GET: { action: getProvisionalVs, access: ['admin', 'editor'] },
})