import type { NextApiRequest, NextApiResponse } from 'next'

import { vsacFhirClient, fhirCdrClient } from 'fhirClients'
import handler from '@/helpers/server/handler'
import logger from '@/helpers/server/logger'
import { findMatchingVsetUrls } from '@/helpers/server/expandUtils'
import { extractOidFromUrl } from '@/utils'
export interface ExpandRequest extends NextApiRequest {
  body: {
    valueSetId?: string
    expansionParameters: { [key: string]: string[] }
    groupersToSearch?: string[]
    codeToFind?: string
    systemToFind?: string
    codeSystem?: string
  }
}

// perhaps simplify the requests by using the data that's in the FE for the table?
const expandValueSets = async (req: ExpandRequest, res: NextApiResponse) => {
  if (!req?.body?.valueSetId) {
    return res.status(400).json({ error: 'Missing valuesetId.' })
  }

  try {
    const valueSet = (await fhirCdrClient.read({ resourceType: 'ValueSet', id: req.body?.valueSetId as string })) as fhir4.ValueSet
    const parameters: fhir4.Parameters = {
      resourceType: 'Parameters',
      parameter: [
        {
          name: 'valueSetVersion',
          valueString: valueSet.version
        }
      ]
    }
    const valueCanonicalString = Object.entries(req.body.expansionParameters).flatMap(([system, versions]) =>
      versions.map((version) => `${system}|${version}`)
    )

    if (valueCanonicalString.length > 0) {
      // @ts-ignore
      parameters.parameter.push({
        name: 'system-version',
        valueCanonical: valueCanonicalString.join(',')
      })
    }
    let response
    const groupersToSearch = req?.body?.groupersToSearch

    const fetchOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...vsacFhirClient.customHeaders
      },
      body: JSON.stringify(parameters)
    }

    // in this case expanding just one valueset
    if (typeof req.body.valueSetId === 'string') {
      const oid = extractOidFromUrl(valueSet.url!)
      const url = vsacFhirClient.baseUrl + `/ValueSet/${oid}/$expand`
      response = await fetch(url, fetchOptions).then((i) => i.json())
      logger.info(`Running $expand to vsac url: ${url} with these options: ${JSON.stringify(fetchOptions)}`)
    } else if (typeof groupersToSearch !== 'undefined') {
      const systemToFind = req?.body?.codeSystem
      const codeToFind = req?.body?.codeToFind
      if (codeToFind) {
        const matchingVsUrlsCodes = await findMatchingVsetUrls({
          fhirCdrClient,
          vsacFhirClient,
          parametersFetchOptions: fetchOptions,
          codeToFind,
          systemToFind,
          groupersToSearch
        })
        res.status(200).send(matchingVsUrlsCodes)
      } else {
        console.error('failed here 1.1')
        return res.status(500).json({ error: 'Missing code or system.' })
      }
    } else {
      console.error('failed here 1')
      return res.status(500).json({ error: 'Invalid request.' })
    }

    res.status(200).send(response)
  } catch (e: any) {
    console.error('failed here')
    console.error('e: ', e)
    console.log(e.response.data)
    logger.error('error in expandValueSets:  ', JSON.stringify(e, null, 2))
    res.status(404).json({ error: 'No results for expansion parameters.' })
  }
}

export default handler({
  POST: {
    action: expandValueSets,
    access: ['admin', 'editor']
  }
})
