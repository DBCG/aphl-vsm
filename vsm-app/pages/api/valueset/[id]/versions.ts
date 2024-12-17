import { is } from '@/helpers/is'
import { getTerminologySource, updateLeafVsVersion } from '@/helpers/valueSetHelpers'
import { terminologyClient } from 'fhirClients'
import FhirClient from '@/backend/clients/FhirClient'
import { VSMSession } from '@/helpers/rolesHelper'

import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import Logger from '@/helpers/server/logger'
import { tsCredentialService } from '@/backend/services/TsCredentialService'

const getVersions = async (req: NextApiRequest, res: NextApiResponse, session: VSMSession) => {
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
    response = await FhirClient.getInstance().read({
      resourceType: 'ValueSet',
      id
    }) as fhir4.ValueSet
  } catch (e) {
    Logger.getLogger().error('error here is: ', e)
    // if error thrown, return
    return res.status(404).json({ error: `Error finding ValueSet with id ${id}.` })
  }

  console.log('response here: ', response)
  const authSourceBase = response?.extension?.find(ext => ext?.url?.endsWith('valueset-authoritativeSource'))?.valueUri?.split('/ValueSet')?.[0]
  if (!authSourceBase) {
    return res.status(404).json({ error: `Leaf valueset lacks authoritative source` })
  }

  const endpointBundle = await FhirClient.getInstance().search({
    resourceType: 'Endpoint',
  }) as fhir4.Endpoint

  const endpoints = endpointBundle?.entry?.map((e: fhir4.BundleEntry) => e?.resource as fhir4.Endpoint)
  console.log('endpoints: ', endpoints)
  
  // the VSAC endpoint is not the same as the authSourceBase
  // trying to use the http protocol for the custom client below didn't work
  // so this is a workaround
  const matchingEndpoint = endpoints?.find((e: fhir4.Endpoint) => {
    console.log('e.address: ', e.address)
    console.log('authSourceBase: ', authSourceBase)
    if (authSourceBase === 'http://cts.nlm.nih.gov/fhir') {
      return e?.address?.toLowerCase() === 'https://cts.nlm.nih.gov/fhir'
    } else {
      return e?.address?.toLowerCase() === authSourceBase.toLowerCase()
    }
  })

  const authCredentials = await tsCredentialService.getCredentials(session.user.id, matchingEndpoint?.id as string)
  let baseTermServerUrl = matchingEndpoint?.address?.toString()

  terminologyClient.setCustomClient({
    baseUrl: baseTermServerUrl,
    clientName: matchingEndpoint?.name?.toString(),
    basicAuthHeader: `${Buffer.from(`${authCredentials.username}:${authCredentials.password}`).toString('base64')}`
  })

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
    Logger.getLogger().error(e)
    return res.status(405).json({ error: `Error: ${id}.` })
  }
}

export default handler({
  GET: { action: getVersions }
})
