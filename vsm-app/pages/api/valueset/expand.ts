import type { NextApiRequest, NextApiResponse } from 'next'
import { vsacFhirClient, fhirCdrClient } from 'fhirClients'
import handler from '@/helpers/server/handler'
import logger from '@/helpers/server/logger'
import { findMatchingVsetUrls, getExpandFetchOptions, setParameterVsVersion } from '@/helpers/server/expandUtils'
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
  try {
    const parameters: fhir4.Parameters = {
      resourceType: 'Parameters',
      parameter: []
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

    // in this case expanding just one valueset
    if (typeof req.body.valueSetId === 'string') {
      const valueSet = (await fhirCdrClient.read({ resourceType: 'ValueSet', id: req.body?.valueSetId as string })) as fhir4.ValueSet

      setParameterVsVersion(parameters, valueSet)
      const oid = extractOidFromUrl(valueSet.url!)
      const url = vsacFhirClient.baseUrl + `/ValueSet/${oid}/$expand`
      const fetchOptions = getExpandFetchOptions(parameters)
      response = await fetch(url, getExpandFetchOptions(parameters)).then((i) => i.json())
      logger.debug(`Running $expand to vsac url: ${url} with these options: ${JSON.stringify(fetchOptions)}`)
    } else if (typeof groupersToSearch !== 'undefined') {
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
