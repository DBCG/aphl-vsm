import { fhirCdrClient, vsacFhirClient } from '@/fhirClients'
import { is } from '@/helpers/is'
import { CreateProvisionalVs, createProvisionalCodeSystem, updateCsCodes } from '@/helpers/provisionalVsHelpers'
import handler from '@/helpers/server/handler'
import logger from '@/helpers/server/logger'
import type { NextApiRequest, NextApiResponse } from 'next'

interface Body extends CreateProvisionalVs {
  grouperIds: string[]
}

interface ReqInfo extends NextApiRequest {
  body: Body
}

interface GetBody {
  systemUrl?: fhir4.CodeSystem['url']
}

interface ProvisionalReqGet extends NextApiRequest {
  body: GetBody
}

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

const getProvisionalCodeSystems = async (req: ProvisionalReqGet, res: NextApiResponse) => {
  try {

    const {
      systemUrl
    } = req.query

    let searchParams = {
      version: 'PROVISIONAL',
      ...(systemUrl && { url: systemUrl })
    }

    // ideally I wouldn't be doing this and would just be using a searchParam on
    // an extension that designates provisional?
    const provisionalCodeSystems = await fhirCdrClient.search({
      resourceType: 'CodeSystem',
      searchParams
    })

    const results = provisionalCodeSystems?.entry?.map((e: any) => e?.resource) || [] as fhir4.ValueSet[]

    return res.status(200).json(results || [])

  } catch (e) {
    logger.error(e)
    res.status(400).json({ error: 'Search for Provisional Code Systems Failed' })
  }
}

// this can update multiple code systems at once
const updateProvisionalCodeSystems = async (req: ProvisionalReqGet, res: NextApiResponse) => {
  try {
    const body = await req.body
    console.log(body)
    const {
      codesBySystemToUpdate
    } = body

    const systemUrls = Object.keys(codesBySystemToUpdate)
    const updatedCodeSystems = []
    console.log('codesbysystemtoupdate: ', codesBySystemToUpdate)

    for (const systemUrl of systemUrls) {
      let searchParams = {
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
        console.log('updated: ', updated)
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

        console.log('cs from term server: ', codeSystemFromTermServer)
        const csName = codeSystemFromTermServer?.entry?.[0]?.resource?.name
        console.log('codeSystem: ', codeSystemFromTermServer)
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
      console.log('updatedCodeSystems: ', updatedCodeSystems)
      const transactionBody = transactionBuilder(updatedCodeSystems)

      const updatedCS = await fhirCdrClient.transaction({
        body: transactionBody
      })

      if (is.operationOutcome(updatedCS)) {
        console.log('error creating prov code items')
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