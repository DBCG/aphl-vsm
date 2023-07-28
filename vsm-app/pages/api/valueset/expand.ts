import type { NextApiRequest, NextApiResponse } from 'next'

import { vsacFhirClient, fhirCdrClient } from 'fhirClients'
import handler from '@/helpers/server/handler'
import logger from '@/helpers/server/logger'
import {
  findMatchingVsetUrls
} from '@/helpers/server/expandUtils'


// perhaps simplify the requests by using the data that's in the FE for the table?
const expandValueSets = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const systems = Object.keys(req.body.expansionParameters)

    const parameter = [] as fhir4.ParametersParameter[]
    systems.forEach((system) => {
      const systemVersions: string[] = req.body.expansionParameters[system]
      const addToParameter = systemVersions.map((version: string) => ({
        name: 'system-version',
        valueCanonical: `${system}|${version}`
      }))
      parameter.push(...addToParameter)
    })

    const parameters = {
      resourceType: 'Parameters',
      parameter
    } as fhir4.Parameters

    let response
    const groupersToSearch = req?.body?.groupersToSearch as string[] | undefined

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
      const systemToFind = req?.body?.codeSystem
      const codeToFind = req?.body?.codeToFind
      
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
      return res.status(500).json({ error: 'Invalid request.' })
    }

    res.status(200).send(response)
  } catch (e: any) {
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
