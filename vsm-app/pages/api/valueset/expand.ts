import type { NextApiRequest, NextApiResponse } from 'next'

import { vsacFhirClient, fhirCdrClient } from 'fhirClients'
import handler from '@/helpers/server/handler'
import logger from '@/helpers/server/logger'
import { findMatchingVsetUrls } from '@/helpers/server/expandUtils'
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
  try {
    const valueCanonicalString = Object.entries(req.body.expansionParameters).flatMap(([system, versions]) =>
      versions.map((version) => `${system}|${version}`)
    )

    const parameters: fhir4.Parameters | null =
      valueCanonicalString.length > 0
        ? {
            resourceType: 'Parameters',
            parameter: [
              {
                name: 'system-version',
                valueCanonical: valueCanonicalString.join(',')
              }
            ]
          }
        : null

    let response
    const groupersToSearch = req?.body?.groupersToSearch

    const fetchOptions = parameters
      ? {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...vsacFhirClient.customHeaders
          },
          body: JSON.stringify(parameters)
        }
      : {
          method: 'GET',
          headers: {
            ...vsacFhirClient.customHeaders
          }
        }

    // in this case expanding just one valueset
    if (typeof req.body.valueSetId === 'string') {
      response = await fetch(vsacFhirClient.baseUrl + '/ValueSet/' + req.body.valueSetId + '/$expand', fetchOptions).then((i) => i.json())
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
