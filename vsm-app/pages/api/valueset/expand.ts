import type { NextApiRequest, NextApiResponse } from 'next'

import { vsacFhirClient, fhirCdrClient } from 'fhirClients'
import handler from '@/helpers/server/handler'
import logger from '@/helpers/server/logger'
import {
  findMatchingVsetUrls
} from '@/helpers/server/expandUtils'
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

    const parameter: fhir4.ParametersParameter[] = Object.entries(req.body.expansionParameters)
      .flatMap(([system, versions]) => versions.map((version) => ({
        name: 'system-version',
        valueCanonical: `${system}|${version}`
      })))

    const parameters: fhir4.Parameters = {
      resourceType: 'Parameters',
      parameter
    }

    let response
    const groupersToSearch = req?.body?.groupersToSearch

    // in this case expanding just one valueset
    if (typeof req.body.valueSetId === 'string') {
      response = await vsacFhirClient.operation({
        name: '$expand',
        id: req.body.valueSetId,
        resourceType: 'ValueSet',
        method: 'POST',
        input: JSON.stringify(parameters),
        options: {
          headers: {
            'content-type': 'application/json'
          }
        }
      })
    } else if (typeof groupersToSearch !== 'undefined') {
      const systemToFind = req?.body?.codeSystem || null
      const codeToFind = req?.body?.codeToFind
      if (!!codeToFind) {
        const matchingVsUrlsCodes = await findMatchingVsetUrls({
          fhirCdrClient,
          vsacFhirClient,
          parameters,
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
