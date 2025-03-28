import type { NextApiRequest, NextApiResponse } from 'next'
import TerminologyFhirClient from '@/backend/clients/TerminologyFhirClient'
import FhirClient from '@/backend/clients/FhirCdrClient'
import handler from '@/helpers/server/handler'
import Logger from '@/helpers/server/logger'
import { getExpandFetchOptions, setParameterVsVersion } from '@/helpers/server/expandUtils'
import { extractOidFromUrl } from '@/utils'
import { VSMSession } from '@/helpers/rolesHelper'

export interface ExpandRequest extends NextApiRequest {
  body: {
    valueSetId?: string
    expansionParameters: { [key: string]: string[] }
    pinnedVersion?: boolean
  }
}

// perhaps simplify the requests by using the data that's in the FE for the table?
const expandValueSets = async (req: ExpandRequest, res: NextApiResponse, session: VSMSession) => {
  const { valueSetId, expansionParameters, pinnedVersion } = req.body
  const userId = session?.user.id
  if (valueSetId == null) {
    Logger.getLogger().error('Invalid request, missing ValueSet ID.')
    return res.status(400).json({ error: 'Invalid request, missing ValueSet ID.' })
  }
  try {
    const valueSet = (await FhirClient.getInstance().read({ resourceType: 'ValueSet', id: valueSetId as string })) as fhir4.ValueSet

    const parameters: fhir4.Parameters = {
      resourceType: 'Parameters',
      parameter: []
    }

    const valueCanonicalString = [] as string[]

    Object.entries(expansionParameters).forEach(([system, versions]) => {
      valueCanonicalString.push(...versions.map((version) => `${system}|${version}`))
    })

    if (valueCanonicalString.length > 0) {
      valueCanonicalString.forEach((version) => {
        // @ts-ignore
        parameters.parameter.push({
          name: 'system-version',
          valueCanonical: version
        })
      })
    }

    if (pinnedVersion) {
      setParameterVsVersion(parameters, valueSet)
    }
    const oid = extractOidFromUrl(valueSet.url!)
    const vsacFhirClient = await TerminologyFhirClient.getClient(userId)
    const url = vsacFhirClient?.baseUrl + `/ValueSet/${oid}/$expand`
    const fetchOptions = getExpandFetchOptions(parameters) as RequestInit
    fetchOptions.headers['Authorization'] = vsacFhirClient.customHeaders['Authorization']

    const response = await fetch(url, fetchOptions).then((i) => i.json())
    Logger.getLogger().debug(`Running $expand to vsac url: ${url} with these options: ${JSON.stringify(fetchOptions)}`)

    res.status(200).send(response)
  } catch (e: any) {
    Logger.getLogger().error('error in expandValueSets:  \n' + JSON.stringify(e, null, 2))
    res.status(404).json({ error: 'No results for expansion parameters.' })
  }
}

export default handler({
  POST: {
    action: expandValueSets,
    access: ['admin', 'editor']
  }
})
