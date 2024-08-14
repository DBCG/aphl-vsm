import type { NextApiRequest, NextApiResponse } from 'next'
import { terminologyClient } from 'fhirClients'
import { logSimpleError } from '@/helpers/server/simpleHapiError'
import handler from '@/helpers/server/handler'
import { fhirCdrClient } from 'fhirClients'
import { getProgramManifestVersions, setExpansionParameters } from '@/helpers/valueSetHelpers'
import logger from '@/helpers/server/logger'
import { uniqBy } from 'lodash'
import { getVSConditions } from '@/helpers/libraryHelpers'

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
    logger.error('An error occured likely from the VSAC side')
    logSimpleError(e)
    return res.status(400).json({ 'server-error': 'ValueSet search failed.' })
  }
}

const collectCodeSystemsFromProgram = async (programId: string) => {
  const program = await fhirCdrClient.read({ resourceType: 'Library', id: programId })
  const conditionsMap = getVSConditions(program as fhir4.Library)
  let codeSystemsList = Object.values(conditionsMap)
    .flat()
    .map((i) => {
      const [system, code] = i.id.split('|')
      return { system, code }
    })
  codeSystemsList = uniqBy(codeSystemsList, 'system')
  terminologyClient.setClient('vsac')
  const activeTerminologyClient = terminologyClient.getClient()
  logger.info('Looking up latest versions for: ' + codeSystemsList.map((i: any) => i?.system))
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
      const list = await collectCodeSystemsFromProgram(programId)
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
  } catch (e) {
    logger.error('error:  ' + JSON.stringify(e, null, 2))
    return res.status(400).json({ 'server-error': 'ValueSet search failed.' })
  }
}

const updateManifest = async (req: NextApiRequest, res: NextApiResponse) => {
  const grouperLibrary = (await fhirCdrClient.read({
    resourceType: 'Library',
    id: req.query.id as string
  })) as fhir4.Library

  if (grouperLibrary.status === 'active') {
    return res.status(400).json({ 'server-error': 'Cannot update manifest on an active program.' })
  }

  setExpansionParameters(grouperLibrary, req.body)
  const updatedExpansionParameters = getProgramManifestVersions(grouperLibrary)

  await fhirCdrClient.update({
    resourceType: 'Library',
    id: grouperLibrary.id,
    body: grouperLibrary
  })
  return res.status(200).json(updatedExpansionParameters)
}

export default handler({
  GET: { action: getManifestVersions, access: ['admin', 'editor'] },
  PUT: { action: updateManifest, access: ['admin', 'editor'] },
  POST: { action: getAvailableLatestVersionsFromLeafValueSets, access: ['admin', 'editor'] }
})
