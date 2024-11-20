import { vsacFhirClient } from '@/fhirClients'
import FhirClient from '@/backend/clients/FhirClient'
import { ErrorItem, is } from '@/helpers/is'
import { createProvisionalCodeSystem, updateCsCodes } from '@/helpers/provisionalVsHelpers'
import handler from '@/helpers/server/handler'
import Logger from '@/helpers/server/logger'
import type { NextApiRequest, NextApiResponse } from 'next'
import { BuilderItem, getProvisionals } from '../../valueset/provisional'
import { updateCsCodeItem } from '@/helpers/codeSystemHelpers'
import { updateVsCodeItem } from '@/helpers/valueSetHelpers'

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
      return ({ error: `Method '${method}' not supported` })
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
      params = { 'provisional-cs-by-base-url': systemUrl }
    }
    const results = await getProvisionals({ resourceType: 'CodeSystem', params })
    if (results.error) {
      return res.status(400).send(results)
    }
    return res.status(200).json(results || [])

  } catch (e) {
    Logger.getLogger().error(e)
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
        'provisional-cs-by-base-url': systemUrl
      }

      const existingProvisionalCS = await FhirClient.getInstance().search({
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
      return res.status(400).json({ error: transactionBody.error })
    }
    const updatedCS = await FhirClient.getInstance().transaction({
      body: transactionBody
    })

    if (is.operationOutcome(updatedCS)) {
      console.error('error creating prov code items')
      return res.status(400).json({ error: 'Failed to create/update provisional code system items' })
    } else {
      return res.status(200).json({})
    }

  } catch (e) {
    Logger.getLogger().error(e)
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
  action: 'replace-code'
  id: string
  codeUpdates: CodeUpdate[]
  inValueSets: string[]
}

export interface DeleteData {
  action: 'delete-code'
  id: string
  codeUpdates: CodeItem[]
  inValueSets: string[]
}

interface ExistingOrNewVs {
  status: 'exists' | 'new'
  vs: fhir4.ValueSet
}

// avoid typescript issues with one or other payload type: https://stackoverflow.com/a/66605669
type Only<T, U> = { [P in keyof T]: P extends keyof U ? never : T[P]; };

type Either<T, U> = Only<T, U> | Only<U, T>;

type PayloadData = Either<UpdateData, DeleteData>

// type UpdatePayload = Record<string, PayloadData>

type UpdatePayload = UpdateData | DeleteData

interface ProvisionalUpdateReq extends NextApiRequest {
  body: UpdatePayload
}

const getAllParentVSets = async (ids: string[]): Promise<fhir4.ValueSet[]> => {
  const getProvisionalLeafsTransactionEntry = ids.map(id => ({
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

  const result = await FhirClient.getInstance().transaction({
    body: getVsTransactionBundle
  })

  if (!result?.entry?.length || !result?.entry?.find((r: any) => r?.resource)) {
    return []
  } else {
    return result?.entry?.map((e: any) => e?.resource)?.filter((x: any) => Boolean(x)) || []
  }
}

const getProvisionalCsById = async (ids: string[]): Promise<fhir4.CodeSystem[]> => {
  const getProvisionalCsTransactionEntry = ids.map(id => ({
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

  const result = await FhirClient.getInstance().transaction({
    body: getCsTransactionBundle
  })

  if (!result?.entry?.length || !result?.entry?.find((r: any) => r?.resource)) {
    return []
  } else {
    return result?.entry?.map((e: any) => e?.resource)?.filter((x: any) => Boolean(x)) || []
  }
}

interface UpdatedResources {
  [key: string]: {
    resource: fhir4.CodeSystem | fhir4.ValueSet
    action: 'update-cs' | 'delete-cs' | 'update-vs'
  }
}

const updateProvisionalCodeSystemAndParentVsets = async (req: ProvisionalUpdateReq, res: NextApiResponse) => {
  try {
    const body = req.body
    const provisionalCsUrlsToUpdate = Object.keys(body)
    // @ts-ignore
    const provisionalCsIdsToUpdate = provisionalCsUrlsToUpdate.map(url => body[url].id).flat()
    // @ts-ignore
    const allParentVsetIds = provisionalCsUrlsToUpdate.map(url => body[url].inValueSets).flat()
    let parentVSets: fhir4.ValueSet[] = []
    // if any codes are used in provisional leafs, go get them first
    // they will need to be updated too
    if (allParentVsetIds.length) {
      const result = await getAllParentVSets(allParentVsetIds)
      if (!result?.length) {
        return res.status(400).json({ error: 'Could not update provisional value sets using these codes' })
      } else {
        parentVSets = result
      }
    }

    let allCsToUpdate: fhir4.CodeSystem[] = await getProvisionalCsById(provisionalCsIdsToUpdate)

    if (!allCsToUpdate?.length) {
      return res.status(400).json({ error: 'Could not find provisional code systems to update' })
    }

    // organize resources by url, indicate what final transaction should do via action
    const updatedVsAndCs: UpdatedResources = {}
    // update CS and VS with code changes
    allCsToUpdate.forEach(async (originalCodeSystem: fhir4.CodeSystem) => {
      // @ts-ignore
      const currentAction = body[originalCodeSystem.url!].action
      const existingCs = updatedVsAndCs?.[originalCodeSystem.url!]?.resource
      // @ts-ignore
      const updateData = body[originalCodeSystem.url!]
      const csToUpdate = existingCs || originalCodeSystem

      const updatedCs: fhir4.CodeSystem | { error: string } = updateCsCodeItem({
        cs: csToUpdate as fhir4.CodeSystem,
        action: currentAction,
        updateData
      })
      // early return if error with updating codesystem
      if ('error' in updatedCs) {
        return res.status(400).json({ error: updatedCs?.error || 'Could not update provisional code system' })
      }

      if (is.errorItem(updatedCs)) {
        return updatedCs
      } else {
        // Check if cs has any codes left. If none, delete CS
        if (!updatedCs?.concept?.length) {
          updatedVsAndCs[originalCodeSystem.url as string] = { resource: updatedCs as fhir4.CodeSystem, action: 'delete-cs' }
        } else {
          // if codesystem is already being deleted, skip any update attempts coming in with the batch
          if (updatedVsAndCs[originalCodeSystem.url as string]?.action === 'delete-cs') {
            return
          }
          updatedVsAndCs[originalCodeSystem.url as string] = { resource: updatedCs as fhir4.CodeSystem, action: 'update-cs' }
        }
      }

      // now, update valuesets if necessary
      if (updateData?.inValueSets?.length) {
        // vsToUpdate may have already been updated, or in original state
        // if updated, we want to use the updated version
        const vsToUpdate = updateData.inValueSets.map((vsId: string) => {
          const existingEditedVs = Object.values(updatedVsAndCs)
            .find((item: any) => item.resource.resourceType === 'ValueSet' && item.resource.id === vsId)?.resource

          const originalVs = parentVSets?.find((vs: fhir4.ValueSet) => vs.id === vsId)
          return ({
            status: existingEditedVs ? 'exists' : 'new',
            vs: existingEditedVs || originalVs
          })
        }) as ExistingOrNewVs[]

        // now, update the valueSets
        // surprisingly, RCKMS wants us to keep valuesets even if they have no codes, so won't delete
        vsToUpdate.forEach((vsItemToUpdate: ExistingOrNewVs) => {
          const item = ({
            resource: updateVsCodeItem({ vs: vsItemToUpdate.vs, action: currentAction, updateData, csUrl: originalCodeSystem.url! }),
            status: vsItemToUpdate.status
          })

          if (is.errorItem(item.resource)) {
            return res.status(400).json({ error: 'Could not update provisional value sets' })
          } else {
            // @ts-ignore
            updatedVsAndCs[item.resource.id] = { resource: item.resource as fhir4.ValueSet, action: 'update-vs' }
          }
        })
      }
    })

    const resources = Object.values(updatedVsAndCs)
    const batch = resources.map(item => {
      const { resourceType, id } = item.resource
      if (item.action === 'delete-cs') {
        return ({
          request: {
            method: 'DELETE',
            url: `${resourceType}/${id}`
          } as fhir4.BundleEntryRequest
        })
      } else {
        return ({
          request: {
            method: 'PUT',
            url: `${resourceType}/${id}`
          } as fhir4.BundleEntryRequest,
          resource: item.resource
        })
      }
    })

    const updateBundle = {
      resourceType: 'Bundle',
      type: 'transaction',
      entry: batch
    } as fhir4.Bundle & { type: 'transaction' }

    const updateTransaction = await FhirClient.getInstance().transaction({
      body: updateBundle
    })

    if (updateTransaction?.entry?.length) {
      return res.status(200).json({ message: 'Successful provisional resource update' })
    } else {
      return res.status(400).json({ error: 'Provisional resource update failed' })
    }
  } catch (e) {
    Logger.getLogger().error(e)
    res.status(400).json({ error: 'Search for Provisional Code Systems Failed' })
  }
}

export default handler({
  GET: { action: getProvisionalCodeSystems, access: ['admin', 'editor', 'reviewer'] },
  POST: { action: updateProvisionalCodeSystems, access: ['admin', 'editor'] },
  PUT: { action: updateProvisionalCodeSystemAndParentVsets, access: ['admin', 'editor'] },
})