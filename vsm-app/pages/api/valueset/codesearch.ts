import type { NextApiRequest, NextApiResponse } from 'next'
import { vsacFhirClient, fhirCdrClient } from 'fhirClients'
import handler from '@/helpers/server/handler'
import { getLogger } from '@/helpers/server/logger'
import { findMatchingVsetUrls } from '@/helpers/server/expandUtils'

export interface ExpandRequest extends NextApiRequest {
  body: {
    expansionParameters: { [key: string]: string[] }
    groupersToSearch?: string[]
    codeToFind?: string
    systemToFind?: string
    codeSystem?: string
  }
}

// perhaps simplify the requests by using the data that's in the FE for the table?
const expandValueSetsCodeSearch = async (req: ExpandRequest, res: NextApiResponse) => {
  try {
    const parameters: fhir4.Parameters = {
      resourceType: 'Parameters',
      parameter: []
    }
    const valueCanonicalString = Object.entries(req.body.expansionParameters).flatMap(([system, versions]) =>
      versions.map((version) => `${system}|${version}`)
    )

    if (valueCanonicalString.length > 0) {
      valueCanonicalString.forEach((version) => {
        // @ts-ignore
        parameters.parameter.push({
          name: 'system-version',
          valueCanonical: version
        })
      })
    }

    const groupersToSearch = req?.body?.groupersToSearch

    if (typeof groupersToSearch !== 'undefined') {
      const systemToFind = req?.body?.codeSystem
      const codeToFind = req?.body?.codeToFind
      if (codeToFind) {
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
        getLogger().error('Missing code for search')
        return res.status(500).json({ error: 'Missing code or system.' })
      }
    } else {
      getLogger().error('Invalid request.')
      return res.status(400).json({ error: 'Invalid request.' })
    }
  } catch (e: any) {
    getLogger().error('error in expandValueSets:  \n' + JSON.stringify(e, null, 2))
    res.status(404).json({ error: 'No results for expansion parameters.' })
  }
}

export default handler({
  POST: {
    action: expandValueSetsCodeSearch,
    access: ['admin', 'editor']
  }
})
