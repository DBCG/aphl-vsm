import type { NextApiRequest, NextApiResponse } from 'next'
import { terminologyClient } from 'fhirClients'
import handler from '@/helpers/server/handler'
import { fhirCdrClient } from 'fhirClients'
import { getProgramManifestVersions, setExpansionParameters } from '@/helpers/valueSetHelpers'
import logger from '@/helpers/server/logger'

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

      //@ts-ignore
      const versions = results?.entry?.map((i: fhir4.BundleEntry) => i?.resource?.version)
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
    logger.error("An error occured likely from the VSAC side")
    return res.status(400).json({ 'server-error': 'ValueSet search failed.' })
  }
}

const getAvailableLatestVersions = async (req: NextApiRequest, res: NextApiResponse) => {
  terminologyClient.setClient('vsac')
  const activeTerminologyClient = terminologyClient.getClient()
  try {
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
    });

    // Parse a bundle of bundle into a list of CodeSystems
    //@ts-ignore
    const latestVersionCodeSystems = latestVersions?.entry?.map((i: fhir4.BundleEntry) => i.resource?.entry?.[0]?.resource)
    return res.status(200).json(latestVersionCodeSystems)
  } catch (e) {
    logger.error('error:  ', e)
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
  POST: { action: getAvailableLatestVersions, access: ['admin', 'editor'] }
})
