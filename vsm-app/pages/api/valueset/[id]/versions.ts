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

  const WHITELIST_FIELDS = ['url', 'extension', 'id', 'version'].join(',')
  const searchParams = { _elements: WHITELIST_FIELDS }

  // if ID not passed in
  if (!is.string(id)) {
    return res.status(400).json({ error: `ID not valid: ${id}.` })
  }

  // first, get the actual ValueSet matching the id
  // from the FHIR server/cache
  try {
    response = await fhirCdrClient.read({
      resourceType: 'ValueSet',
      id: id
    })
  } catch (e) {
    logger.error('error here is: ', e)
    // if error thrown, return
    return res.status(401).json({ error: `Error finding ValueSet with id ${id}.` })
  }

  // if valueset not found in FHIR server, return
  if (!is.valueSet(response)) {
    return res.status(403).json({ error: `No ValueSet found with ID: ${id}.` })
  }

  // identify the terminology server for the valueSet
  // this will try to infer the source if the extension isn't there
  const terminologySource = getTerminologySource(response)?.value

  // if there is no terminology source that matches the URL's pattern, don't continue
  if (!terminologySource) {
    return res.status(404).json({ error: `No maching terminology server found for query.` })
  }

  terminologyClient.setClient(terminologySource as 'vsac' | 'ontoserver_r4') // TS: at this point source's a string
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

const updateVsVersion = async (req: NextApiRequest, res: NextApiResponse) => {
  console.log('here');
  
  try {
    const body = await req.body
    const { vsCanonical, vsVersion, grouperIds } = body

    const groupersToUpdate = await Promise.all(
      grouperIds.map((grouperVsId: string) =>
        fhirCdrClient.read({
          resourceType: 'ValueSet',
          id: grouperVsId
        })
      )
    )

    const updatedGroupers = groupersToUpdate?.map((grouperVs: fhir4.ValueSet) => updateLeafVsVersion(grouperVs, vsCanonical, vsVersion))

    await Promise.all(
      updatedGroupers.map((grouperVs: fhir4.ValueSet) =>
        fhirCdrClient.update({
          resourceType: 'ValueSet',
          id: grouperVs.id,
          body: grouperVs
        })
      )
    )

    res.status(200).json({ message: 'Update valueset versions completed' })
  } catch (e) {
    logger.error(e)
    res.status(500).json({ error: 'Error updating valueset versions' })
  }
}

export default handler({
  GET: { action: getVersions },
  PUT: { action: updateVsVersion, access: ['admin', 'editor'] }
})
