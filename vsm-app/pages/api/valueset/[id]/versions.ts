import { getTerminologySource } from '@/helpers/valueSetHelpers'
import { fhirCdrClient, terminologyClient } from 'fhirClients'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<any> {
  if (req.method === 'GET') {
    // create library template
    let response
    const { id } = req.query

    const WHITELIST_FIELDS = ['url', 'extension', 'id', 'version'].join(',')
    const searchParams = { _elements: WHITELIST_FIELDS }

    // if ID not passed in
    if (!id) {
      return res.status(400).json({ error: `ID not valid: ${id}.`})
    }

    // first, get the actual ValueSet matching the id
    try {
      response = await fhirCdrClient.read({
        resourceType: 'ValueSet', 
        id: id // handle TS error
      })
    } catch (e) {
      console.error(e)
      // if error thrown, return
      return res.status(400).json({ error: `Error finding ValueSet with id ${id}.`})
    }

    // if response errors out, return
    if (!response?.ok) {
      return res.status(400).json({ error: `Error response for ValueSet with id ${id}.`})
    }

    // if valueset not found in FHIR server, return
    if (response?.resourceType === 'OperationOutcome') {
      return res.status(200).json({ error: `No ValueSet found with ID: ${id}.`})
    }

    // identify the terminology server for the valueSet
    const terminologySource = getTerminologySource(response)?.value

    // if there is no terminology source that matches the URL's pattern, don't continue
    if (!terminologySource) {
      return res.status(400).json({ error: `No maching terminology server found for query.`})
    }

    terminologyClient.setClient(terminologySource)  // TS: at this point source's a string
    // if the terminology server exists, set the terminology server to use that data source
    const terminologyClientInstance = terminologyClient.getClient()

    let matchingVSetsFromTermServer
    let versions

    try {
      // a FHIR search should yield all versions if given
      matchingVSetsFromTermServer = await terminologyClientInstance?.search({
        resourceType: 'ValueSet',
        searchParams: {
          url: trimmedValueSet.url,
          ...searchParams
        }
      })
    } catch (e) {
      console.error(e)
      return res.status(400).json({ error: `Error: ${id}.`})
    }
    // map through each valueSet and if version exists, keep it in an array
    // filter out any undefined values
    versions = matchingVSetsFromTermServer?.entry?.map((e: fhir4.BundleEntry) => e?.resource?.version)
      ?.filter(x => x)
    
    // } catch (e: any) {
    //   console.error('error:  ', e)
    //   res.status(400).json({ error: 'Creation of new library failed.' })
    // }
  
    // if response was NOT ok (not 200 from FHIR server, but did complete)
    console.error('Failure to perform $draft from FHIR server')
    res.status(422).json({ error: 'Creation of new library failed.' })
  } else {
    console.error(`Method '${req.method} not supported.'`)
    res.status(405).json({ error: 'Method not allowed.' })
  }
}
