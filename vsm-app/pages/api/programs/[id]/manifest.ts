import type { NextApiRequest, NextApiResponse } from 'next'
import { terminologyClient } from 'fhirClients'
import { logSimpleError } from '@/helpers/server/simpleHapiError'
import handler from '@/helpers/server/handler'
import FhirClient from '@/backend/clients/FhirClient'
import { getProgramManifestVersions, isGrouperValueSet, setExpansionParameters } from '@/helpers/valueSetHelpers'
import Logger from '@/helpers/server/logger'
import { uniqBy } from 'lodash'
import { addTerminologyEndpointToParameters } from '@/helpers/fhirResourceHelper'
import { Agent, fetch as f } from 'undici'
import { is } from '@/helpers/is'

const getManifestVersions = async (req: NextApiRequest, res: NextApiResponse) => {
  terminologyClient.setClient('vsac')
  const activeTerminologyClient = terminologyClient.getClient()
  try {
    if (req.query.url) {
      const results = await activeTerminologyClient?.search({
        resourceType: 'CodeSystem',
        searchParams: {
          system: req.query.url
        }
      })

      const versions = results?.entry?.map((i: fhir4.BundleEntry) => ({
        //@ts-ignore
        version: i?.resource?.version,
        //@ts-ignore
        id: i?.resource?.id + '-' + i?.resource?.version,
        //@ts-ignore
        date: i?.resource?.date
      }))
      return res.status(200).json(versions)
    }

    const terminologyCapabilityStatement = await activeTerminologyClient?.capabilityStatement()
    const availableCodeSystems = terminologyCapabilityStatement?.extension
      ?.map((ext: fhir4.Extension) => {
        let uri, name, latestVersion
        ext?.extension?.forEach((e: fhir4.Extension) => {
          switch (e.url) {
            case 'system':
              uri = e.valueUri
              break
            case 'version':
              latestVersion = e.valueString
              break
            case 'name':
              name = e.valueString
              break
          }
        })

        return { uri, name, latestVersion }
      })
      .filter((x: any) => x.uri && x.name)

    return res.status(200).json(availableCodeSystems)
  } catch (e) {
    Logger.getLogger().error('An error occured likely from the VSAC side')
    logSimpleError(e)
    return res.status(400).json({ 'server-error': 'ValueSet search failed.' })
  }
}

const collectCodeSystemsFromLeafValuesets = async (programId: string) => {
  const parameters = addTerminologyEndpointToParameters({ resourceType: 'Parameters' } as fhir4.Parameters)

  const response = await f(`${FhirClient.getInstance().baseUrl}/Library/${programId}/$ecr.package`, {
    body: JSON.stringify(parameters),
    method: 'POST',
    dispatcher: new Agent({
      connectTimeout: 24 * 60 * 60 * 1000,
      headersTimeout: 24 * 60 * 60 * 1000,
      keepAliveTimeout: 24 * 60 * 60 * 1000,
      keepAliveMaxTimeout: 24 * 60 * 60 * 1000
    }),
    // @ts-ignore
    headers: {
      'Content-Type': 'application/fhir+json',
      // should be Basic Auth creds
      ...FhirClient.getInstance().customHeaders
    }
  })
    .then((i) => i.json())
    .catch((err) => {
      Logger.getLogger().error('Something went wrong with $package operation for program Id:' + programId)
      Logger.getLogger().error(err)
      throw new Error('Something went wrong while packaging')
    })
  const isError = is.hapiOperationOutcomeError(response)
  if (isError) {
    const operationOutcome = response as fhir4.OperationOutcome
    const errorMsg = operationOutcome?.issue?.[0]?.diagnostics
    throw new Error(errorMsg)
  }

  const bundleResponse = response as fhir4.Bundle
  const allLeafVs = bundleResponse ?.entry
    ?.map((i: fhir4.BundleEntry) => i.resource as fhir4.ValueSet)
    ?.filter((i: fhir4.ValueSet) => i.resourceType === 'ValueSet' && !isGrouperValueSet(i))

  let codeSystemsList: fhir4.Coding[] = []

  allLeafVs?.forEach((i: fhir4.ValueSet) => {
    const codeSystems =
      i?.compose?.include?.map((i: fhir4.ValueSetComposeInclude) => ({
        system: i.system,
        code: i.concept?.[0]?.code
      })) || ([] as fhir4.Coding[])
    codeSystemsList.push(...codeSystems)
  })

  codeSystemsList = uniqBy(codeSystemsList, 'system').filter((i) => i)
  terminologyClient.setClient('vsac')
  const activeTerminologyClient = terminologyClient.getClient()
  Logger.getLogger().info('Looking up latest versions for: ' + codeSystemsList.map((i: any) => i?.system))
  const latestVersions = await activeTerminologyClient?.batch({
    body: {
      resourceType: 'Bundle',
      type: 'batch',
      entry: codeSystemsList.map((i: fhir4.Coding) => {
        const { system, code } = i
        return {
          request: {
            method: 'GET',
            url: `/CodeSystem/$lookup?system=${system}&code=${code}`
          }
        }
      })
    }
  })

  const foundVersions = latestVersions?.entry?.map(
    // @ts-ignore
    (i: fhir4.Parameters) => i?.resource?.parameter?.find((j: fhir4.ParametersParameter) => j.name === 'version')?.valueString
  )

  // We need to return the system to reference the version because it is not included in the $lookup response
  return codeSystemsList
    .map((i: fhir4.Coding, index: number) => {
      const version = foundVersions[index]
      if (version) {
        return { system: i.system, version }
      }
    })
    .filter((i: any) => i)
}

const getAvailableLatestVersionsFromLeafValueSets = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    if (req.query.leafValueSets) {
      const programId = req.query.id as string

      // Check all leaf ValueSets and collect their CodeSystem's
      const list = await collectCodeSystemsFromLeafValuesets(programId)
      return res.status(200).json(list)
    } else {
      terminologyClient.setClient('vsac')
      const activeTerminologyClient = terminologyClient.getClient()
      const latestVersions = await activeTerminologyClient?.batch({
        body: {
          resourceType: 'Bundle',
          type: 'batch',
          entry: Object.entries(req.body).map((i) => {
            const [system, version] = i
            return {
              request: {
                method: 'GET',
                url: `/CodeSystem?system=${system}&version=${version}`
              }
            }
          })
        }
      })

      // Parse a bundle of bundle into a list of CodeSystems
      //@ts-ignore
      const latestVersionCodeSystems = latestVersions?.entry?.map((i) => ({
        system: i.resource?.entry?.[0]?.resource?.url,
        version: i.resource?.entry?.[0]?.resource?.version
      }))
      return res.status(200).json(latestVersionCodeSystems)
    }
  } catch (e: any) {
    const message = e?.message
    Logger.getLogger().error('error:  ' + message)
    return res.status(400).json({ error: message })
  }
}

const updateManifest = async (req: NextApiRequest, res: NextApiResponse) => {
  const grouperLibrary = (await FhirClient.getInstance().read({
    resourceType: 'Library',
    id: req.query.id as string
  })) as fhir4.Library

  if (grouperLibrary.status === 'active') {
    return res.status(400).json({ 'server-error': 'Cannot update manifest on an active program.' })
  }

  setExpansionParameters(grouperLibrary, req.body)
  const updatedExpansionParameters = getProgramManifestVersions(grouperLibrary)

  await FhirClient.getInstance().update({
    resourceType: 'Library',
    id: grouperLibrary.id,
    body: grouperLibrary
  })
  return res.status(200).json(updatedExpansionParameters)
}

export default handler({
  GET: { action: getManifestVersions, access: ['admin', 'editor', 'reviewer'] },
  PUT: { action: updateManifest, access: ['admin', 'editor'] },
  POST: { action: getAvailableLatestVersionsFromLeafValueSets, access: ['admin', 'editor'] }
})
