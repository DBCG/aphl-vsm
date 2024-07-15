import { fhirCdrClient, vsacFhirClient } from '@/fhirClients'
import { ErrorItem, is } from '@/helpers/is'
import { createProvisionalCodeSystem, updateCsCodes } from '@/helpers/provisionalVsHelpers'
import handler from '@/helpers/server/handler'
import logger from '@/helpers/server/logger'
import type { NextApiRequest, NextApiResponse } from 'next'
import { BuilderItem, getProvisionals } from '../../valueset/provisional'

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

export default handler({
    GET: { action: getProvisionalCodeSystems, access: ['admin', 'editor'] },
    POST: { action: updateProvisionalCodeSystems, access: ['admin', 'editor'] },
  })