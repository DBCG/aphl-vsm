import { fhirCdrClient, vsacFhirClient } from '@/fhirClients'
import { ErrorItem, is } from '@/helpers/is'
import { createProvisionalCodeSystem, updateCsCodes } from '@/helpers/provisionalVsHelpers'
import handler from '@/helpers/server/handler'
import logger from '@/helpers/server/logger'
import type { NextApiRequest, NextApiResponse } from 'next'
import { BuilderItem, getProvisionals } from '../../valueset/provisional'
import { cloneDeep } from 'lodash'
import { updateCsCodeItem } from '@/helpers/codeSystemHelpers'

interface CodeItem {
  code: string
  display: string
  definition: string
}

type CodesBySysToUpdate = Record<string, CodeItem[]>

interface GetBody {
  systemUrl?: fhir4.CodeSystem['url']
  codesBySystemToUpdate: CodesBySysToUpdate
}

interface ProvisionalReqGet extends NextApiRequest {
  body: GetBody
}

interface UpdatedCS {
  method: 'PUT' | 'POST' | 'GET'
  resource: fhir4.CodeSystem
}

const transactionBuilder = (items: BuilderItem[]): fhir4.Bundle & {
  type: 'transaction'
} | ErrorItem => {
  const transactionEntry = items.map(i => {
    const resourceType = i?.resourceType || i?.resource?.resourceType as string
    const resourceId = i?.resourceId || i?.resource?.id as string
    const method = i.method as BuilderItem["method"]
    // can't know the ID if the resource doesn't exist yet
    let url
    let resource
    if (method === 'PUT') {
      url = `${resourceType}/${resourceId}`
      resource = i.resource
    } else if (method === 'POST') {
      resource = i.resource
    } else if (method === 'GET') {
      url = `${resourceType}/${resourceId}`
    } else {
      return ({ error: `Method '${method}' not supported`})
    }

    let requestBody = {
      request: {
        method,
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

const getProvisionalCodeSystems = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    let params = {}
    const systemUrl = req?.query?.systemUrl
    if (systemUrl) {
      params = { url: systemUrl }
    }
    const results = await getProvisionals({ resourceType: 'CodeSystem', params })
    if (results.error) {
      return res.status(400).send(results)
    }
    return res.status(200).json(results || [])

  } catch (e) {
    logger.error(e)
    res.status(400).json({ error: 'Search for Provisional Code Systems Failed' })
  }
}

// this can update multiple code systems at once
const updateProvisionalCodeSystems = async (req: ProvisionalReqGet, res: NextApiResponse) => {
  try {
    const body = req.body
    const {
      codesBySystemToUpdate
    } = body

    const updatedCodeSystems = [] as UpdatedCS[]

    for (const systemUrl in codesBySystemToUpdate) {
      const searchParams = {
        version: 'PROVISIONAL',
        url: systemUrl
      }

      const existingProvisionalCS = await fhirCdrClient.search({
        resourceType: 'CodeSystem',
        searchParams
      })

      const result = existingProvisionalCS?.entry?.map((e: any) => e?.resource) || [] as fhir4.ValueSet[]
      if (result.length) {
        const updated = updateCsCodes({
          codeSystem: result[0],
          codeItems: codesBySystemToUpdate[systemUrl],
          action: 'add'
        })
        // if provisional cs already exists, update existing
        updatedCodeSystems.push({
          method: 'PUT',
          resource: updated
        })
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
        const newResource = createProvisionalCodeSystem({
          name: csName || 'No name provided',
          systemBaseUrl: systemUrl,
          codeItems: codesBySystemToUpdate[systemUrl]
        })
        // code system does not exist, create new
        updatedCodeSystems.push({
          method: 'POST',
          resource: newResource
        })
      }
    }

    const transactionBody = transactionBuilder(updatedCodeSystems)

    if (is.errorItem(transactionBody)) {
      return res.status(400).json({ error: transactionBody.error})  
    }
    const updatedCS = await fhirCdrClient.transaction({
      body: transactionBody
    })

    if (is.operationOutcome(updatedCS)) {
      console.error('error creating prov code items')
      return res.status(400).json({ error: 'Failed to create/update provisional code system items'}) 
    } else {
      return res.status(200).json({})
    }

  } catch(e) {
    logger.error(e)
    res.status(400).json({ error: 'Search for Provisional Code Systems Failed' })
  }
}

// need a structure so that we can know exactly what is being replaced with what
// since the codes might already be in use in valuesets
interface CodeUpdate {
  old: CodeItem,
  new: CodeItem
}

export interface UpdateData {
  action: 'replace'
  codeUpdates: CodeUpdate[]
  inValueSets: string[]
}

type UpdatePayload = Record<string, UpdateData>

interface ProvisionalUpdateReq extends NextApiRequest {
  body: UpdatePayload
}

const updateProvisionalCodeSystemAndParentVsets = async (req: ProvisionalUpdateReq, res: NextApiResponse) => {
  try {
    const body = req.body
    const provisionalCsUrlsToUpdate = Object.keys(body)
    const provisionalCsIdsToUpdate = provisionalCsUrlsToUpdate.map(url => body[url].id).flat()

    const allParentVsetIds = provisionalCsUrlsToUpdate.map(url => body[url].inValueSets).flat()
    let parentVSets = []
    // if any codes are used in provisional leafs, go get them first
    // they will need to be updated too
    if (allParentVsetIds.length) {
      const getProvisionalLeafsTransactionEntry = allParentVsetIds.map(id => ({
        request: {
          method: 'GET',
          url: `ValueSet/${id}`
        }
      })) as fhir4.BundleEntry[]

      const getVsTransactionBundle = {
        resourceType: 'Bundle',
        type: 'transaction',
        entry: getProvisionalLeafsTransactionEntry
      } as fhir4.Bundle & {
        type: 'transaction'
      }

      const result = await fhirCdrClient.transaction({
        body: getVsTransactionBundle
      })

      if (!result?.entry?.length || !result?.entry?.find(r => r?.resource)) {
        return res.status(400).json({ error: 'Could not update provisional value sets using these codes'})  
      } else {
        parentVSets = result?.entry?.map(e => e?.resource)?.filter(x => Boolean(x)) || []
      }
    }

    let allCsToUpdate
    // next, get the codesystems and update them based on the data provided
    const getProvisionalCsTransactionEntry = provisionalCsIdsToUpdate.map(id => ({
      request: {
        method: 'GET',
        url: `CodeSystem/${id}`,
        version: 'PROVISIONAL'
      }
    })) as fhir4.BundleEntry[]

    const getCsTransactionBundle = {
      resourceType: 'Bundle',
      type: 'transaction',
      entry: getProvisionalCsTransactionEntry
    } as fhir4.Bundle & {
      type: 'transaction'
    } 
    const getCsResult = await fhirCdrClient.transaction({
      body: getCsTransactionBundle
    })

    if (!getCsResult?.entry?.length || !getCsResult?.entry?.find(r => r?.resource)) {
      return res.status(400).json({ error: 'Could not find provisional code systems to update'})  
    } else {
      allCsToUpdate = getCsResult?.entry?.map((e) => e.resource)?.filter((x) => Boolean(x))
    }

    const updatedVsAndCs: (fhir4.ValueSet|fhir4.CodeSystem)[] = []
    // update CS and VS with code changes and push to arr
    allCsToUpdate.forEach((originalCodeSystem: fhir4.CodeSystem) => {

      // if CS has already been updated, should be working on top of those updates so they're not erased
      const existingUpdatedCsIndex = updatedVsAndCs.findIndex(
        updatedResource => (updatedResource.url === originalCodeSystem.url)
        && updatedResource.resourceType === 'CodeSystem'
      )

      const csAlreadyUpdated = existingUpdatedCsIndex > -1

      const updateData = body[originalCodeSystem.url!]
      const csToUpdate = csAlreadyUpdated ? updatedVsAndCs[existingUpdatedCsIndex] : originalCodeSystem as fhir4.CodeSystem
      const updatedCs = updateCsCodeItem({ cs: csToUpdate, action: 'replace', updateData })

      if (updatedCs.error) {
        return updatedCs
      } else if (csAlreadyUpdated) {
        updatedVsAndCs[existingUpdatedCsIndex] = updatedCs
      } else {
        updatedVsAndCs.push(updatedCs)
      }

      if (updateData.inValueSets.length) {
        const vsIds = updateData.inValueSets
        // if this change needs to be propagated to any valuesets, must update vs contents on code editing
        const vSetsToUpdate = vsIds.map(id => {
          if ()
        })
      }
    })
    console.log('updatedVsAndCs: ', updatedVsAndCs)
    // const [
    //   newCodeSystemConcept,
    //   parentValueSets,
    //   action,
    //   dataContext
    // ] = Object.values(body)

    // const updatedCodeSystems = [] as UpdatedCS[]

    //   const searchParams = {
    //     version: 'PROVISIONAL',
    //     url: provisionalCsUrlToUpdate
    //   }

    //   const existingProvisionalCS = await fhirCdrClient.search({
    //     resourceType: 'CodeSystem',
    //     searchParams
    //   })

    //   const result = existingProvisionalCS?.entry?.map((e: any) => e?.resource) || [] as fhir4.ValueSet[]
    //   if (result.length) {
    //     const updated = updateCsCodes({
    //       codeSystem: result[0],
    //       codeItems: newCodeSystemConcept,
    //       action: action === 'replace' ? 'override' : 'add'
    //     })
    //     // if provisional cs already exists, update existing
    //     updatedCodeSystems.push({
    //       method: 'PUT',
    //       resource: updated
    //     })

    //     if (parentValueSets) {
    //       parentValueSets.forEach((vs) => {
    //         const clonedProvisional = cloneDeep(vs)

    //       })
    //     }
    //   } else {
        // error here?
        // const codeSystemFromTermServer = await vsacFhirClient.search({
        //   resourceType: 'CodeSystem',
        //   searchParams: {
        //     status: 'active',
        //     _sort: 'latest',
        //     url: systemUrl,
        //     _count: 1
        //   }
        // })

        // const csName = codeSystemFromTermServer?.entry?.[0]?.resource?.name
        // const newResource = createProvisionalCodeSystem({
        //   name: csName || 'No name provided',
        //   systemBaseUrl: systemUrl,
        //   codeItems: codesBySystemToUpdate[systemUrl]
        // })
        // // code system does not exist, create new
        // updatedCodeSystems.push({
        //   method: 'POST',
        //   resource: newResource
        // })
      // }

    // const transactionBody = transactionBuilder(updatedCodeSystems)

    // if (is.errorItem(transactionBody)) {
    //   return res.status(400).json({ error: transactionBody.error})  
    // }
    // const updatedCS = await fhirCdrClient.transaction({
    //   body: transactionBody
    // })

    // if (is.operationOutcome(updatedCS)) {
    //   console.error('error creating prov code items')
    //   return res.status(400).json({ error: 'Failed to create/update provisional code system items'}) 
    // } else {
    //   return res.status(200).json({})
    // }

  } catch(e) {
    logger.error(e)
    res.status(400).json({ error: 'Search for Provisional Code Systems Failed' })
  }
}

export default handler({
    GET: { action: getProvisionalCodeSystems, access: ['admin', 'editor', 'reviewer'] },
    POST: { action: updateProvisionalCodeSystems, access: ['admin', 'editor'] },
    PUT: { action: updateProvisionalCodeSystemAndParentVsets, access: ['admin', 'editor'] },
  })