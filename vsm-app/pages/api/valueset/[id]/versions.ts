import { is } from '@/helpers/is'
import { getTerminologySource, updateLeafVsVersion } from '@/helpers/valueSetHelpers'
import { fhirCdrClient, terminologyClient } from 'fhirClients'
import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import logger from '@/helpers/server/logger'

const getVersions = async (req: NextApiRequest, res: NextApiResponse) => {
  // create library template
  let response
  const { id } = req.query

  const searchParams = { }

  // if ID not passed in
  if (!is.string(id)) {
    return res.status(400).json({ error: `ID not valid: ${id}.` })
  }

  // first, get the actual ValueSet matching the id
  // from the FHIR server/cache
  try {
    response = await fhirCdrClient.read({
      resourceType: 'ValueSet',
      id
    }) as fhir4.ValueSet
  } catch (e) {
    logger.error('error here is: ', e)
    // if error thrown, return
    return res.status(404).json({ error: `Error finding ValueSet with id ${id}.` })
  }

  // identify the terminology server for the valueSet
  // this will try to infer the source if the extension isn't there
  var errors: string[] = []
  const terminologySource = getTerminologySource(response, errors)?.value

  // if there is no terminology source that matches the URL's pattern, don't continue
  if (!terminologySource) {
    return res.status(404).json({ error: `No maching terminology server found for query.` })
  }

  terminologyClient.setClient(terminologySource as 'vsac' | 'ontoserverR4') // TS: at this point source's a string
  // if the terminology server exists, set the terminology server to use that data source
  const terminologyClientInstance = terminologyClient.getClient()

  let matchingVSetsFromTermServer

  try {
    // a FHIR search should yield all versions if given
    matchingVSetsFromTermServer = await terminologyClientInstance?.search({
      resourceType: 'ValueSet',
      searchParams: {
        url: response?.url?.split('|')?.[0] as string,
        ...searchParams
      }
    })

    // map through each valueSet and if version exists, keep it in an array
    // filter out any undefined values
    const versions = matchingVSetsFromTermServer?.entry
      ?.map((e: fhir4.BundleEntry) => {
        const vs = e?.resource as fhir4.ValueSet
        return vs?.version
      })
      ?.filter((x: string | undefined) => x)

    return res.status(200).json(versions)
  } catch (e) {
    logger.error(e)
    return res.status(405).json({ error: `Error: ${id}.` })
  }
}

export default handler({
  GET: { action: getVersions }
})
