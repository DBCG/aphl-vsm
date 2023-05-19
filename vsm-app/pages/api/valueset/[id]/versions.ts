import { is } from '@/helpers/is'
import { addExtensionToVs, getTerminologySource, authoritativeSourceExtensionUrl, updateLeafVsVersion } from '@/helpers/valueSetHelpers'
import { fhirCdrClient, terminologyClient } from 'fhirClients'
import { terminologyServerEndpoints } from '@/fhirClientOptions'
import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import logger from '@/helpers/server/logger'
import { updateConditions } from '@/helpers/conditionHelpers'

interface SrchParams extends fhir4.SearchParameter {
  // url: string
  // _elements?: string
  // version?: string
  _sort?: string
}

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

const updateVsVersion = async (req: NextApiRequest, res: NextApiResponse) => {
  console.log('attempt')
  try {
    const body = await req.body
    const bodyJson = JSON.parse(body)

    console.log('bodyJson: ', bodyJson)
    
    const { vsCanonical, vsVersion, groups, terminologyInfo, originalVsVersion, useContext } = bodyJson
    const grouperIds = groups?.map(g => g?.id)
    const matchingTermServer = terminologyServerEndpoints?.find(e => e.label === terminologyInfo.value)
    // don't like doing this, but add -version to url if it's vsac only
    // the issue is that CQF is not letting us use a [url:contains] to find the base canonical
    const versionInfo = vsVersion && matchingTermServer?.value.title === 'vsac' ? `-${vsVersion}` : ''

    const [leafUrl, originalLeafVersion] = vsCanonical.split('|') 
    console.log('vs canonical: ', vsCanonical) 
    let searchParams = {
      ['_url:contains']: vsCanonical,
      // url: `${vsCanonical}${versionInfo}`,
      _sort: ['version', 'date']
    }

    // Reminder: VSAC does not respect version, CQF does
    if (vsVersion && vsVersion !== 'latest') {
      searchParams.version = vsVersion
    }

    // check in CQF first to see if already exists
    const matchInCqf = await fhirCdrClient.search({
      resourceType: 'ValueSet',
      searchParams
    })

    console.log('matchInCqf: ', matchInCqf)
    // return res.status(400)
    if (!matchInCqf?.entry) {
      // get the valueset with the new version if it doesn't exist in CQF

      // if for some reason we cannot identify the original terminology server this came from
      if (!matchingTermServer) {
        logger.error(`Could not identify terminology server to fetch ${vsCanonical}`)
        return res.status(404).json({ error: 'Could not identify Valueset source server to update version. You may attempt to add the Valueset to this program again to fix.' })
      }

      // now that you have identified the server, set the client to use it and grab the valueset
      terminologyClient.setClient(matchingTermServer.value.title as 'vsac' | 'ontoserverR4')
      const terminologyClientInstance = terminologyClient.getClient()

      let termServerSearchParams = {
        url: vsCanonical,
        _sort: ['version', 'date']
      }
  
      // Reminder: VSAC does not respect version, CQF does
      if (vsVersion && vsVersion !== 'latest') {
        termServerSearchParams.version = vsVersion
      }

      // this will only give us back subsetted results, we need the entire valueset
      const matchBundle = await terminologyClientInstance?.search({
        resourceType: 'ValueSet',
        searchParams: termServerSearchParams
      })

      let results = matchBundle?.entry

      if (!results) {
        logger.error(`No matches found for valueset ${vsCanonical} in terminology server ${matchingTermServer.label}`)
        return res.status(404).json({ error: 'Could not identify Valueset source server to update version. You may attempt to add the Valueset to this program again to fix.' })
      }
      console.log('got here ', 1)
      let match
      // extra filter here in case, VSAC doesn't filter by version
      if (results) {
        match = results.find((bundleEntryItem) => bundleEntryItem.resource.version === vsVersion)
      }

      if (!match) {
        logger.error('no match found')
        return
      }
      console.log('got here ', 2)
      // get entire valueset, not subsetted to save to CQF
      let matchingWholeVs = await terminologyClientInstance?.read({
        resourceType: 'ValueSet',
        id: match.resource.id
      })

      // add authoritative source
      matchingWholeVs = addExtensionToVs(matchingWholeVs, matchingTermServer.value.url, authoritativeSourceExtensionUrl)

      // add conditions... just pass whole useContext?
      matchingWholeVs.useContext = useContext

      // save this to the fhir server
      // matchingWholeVs.version = vsVersion
      // matchingWholeVs.url = `${vsCanonical}|${vsVersion}`
      const created = await fhirCdrClient.create({
        resourceType: 'ValueSet',
        body: matchingWholeVs
      })

      console.log('created: ', created)
    }

    console.log('grouperids ', grouperIds)
    const groupersToUpdate = await Promise.all(
      grouperIds.map((grouperVsId: string) => (
        fhirCdrClient.read({
          resourceType: 'ValueSet',
          id: grouperVsId
        }))
      )
    )

    console.log('groupers to update: ', groupersToUpdate)
    const updatedGroupers = groupersToUpdate?.map((grouperVs: fhir4.ValueSet) => updateLeafVsVersion(grouperVs, vsCanonical, vsVersion))

    const result = await Promise.all(
      updatedGroupers.map((grouperVs: fhir4.ValueSet) =>
        fhirCdrClient.update({
          resourceType: 'ValueSet',
          id: grouperVs.id,
          body: grouperVs
        })
      )
    )
    // debugger
    return res.status(200).json({ message: 'Update valueset versions completed' })
  } catch (e) {
    logger.error(e)
    return res.status(500).json({ error: 'Error updating valueset versions' })
  }
}

export default handler({
  GET: { action: getVersions },
  PUT: { action: updateVsVersion, access: ['admin', 'editor'] }
})