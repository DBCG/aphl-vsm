import type { NextApiRequest, NextApiResponse } from 'next'
import { terminologyClient } from 'fhirClients'
import handler from '@/helpers/server/handler'
import { fhirCdrClient } from 'fhirClients'
import { getExpansionParametersSystemVersion, setExpansionParameters } from '@/helpers/valueSetHelpers';
import { getGrouperLibraryCanonical } from '@/helpers/libraryHelpers';

const getManifestVersions = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
    terminologyClient.setClient('vsac')
    const activeTerminologyClient = terminologyClient.getClient()
  try {
    if (req.query.url) {
      const results = await activeTerminologyClient?.search({
        resourceType: 'CodeSystem',
        searchParams: {
          system: req.query.url,
        }
      })

      //@ts-ignore
      const versions = results?.entry?.map((i: fhir4.BundleEntry) => i?.resource?.version)
      return res.status(200).json(versions)
    }

    const terminologyCapabilityStatement = await activeTerminologyClient?.capabilityStatement()
    const availableCodeSystems = terminologyCapabilityStatement?.extension?.map((ext: fhir4.Extension) => {
      const uri = ext?.extension?.find(({url}) => url === 'system')?.valueUri
      const name = ext?.extension?.find(({url}) => url === 'name')?.valueString
      return { uri, name }
    }).filter((x: any) => x.uri && x.name)

    return res.status(200).json(availableCodeSystems)
  } catch (e) {
    console.error('error:  ', e)
    return res.status(400).json({ 'server-error': 'ValueSet search failed.' })
  }
}

const updateManifest = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  const grouperLibrary = await fhirCdrClient.read({
    resourceType: 'Library',
    id: req.query.id as string
  }) as fhir4.Library

 const manifestLibraryUrl = getGrouperLibraryCanonical(grouperLibrary)

  const manifestLibrary = await fhirCdrClient.search({
    resourceType: 'Library',
    searchParams: {
      url: manifestLibraryUrl as string
    }
  }).then (res => res?.entry?.[0]?.resource)

  setExpansionParameters(manifestLibrary, req.body)
  const updatedExpansionParameters = getExpansionParametersSystemVersion(manifestLibrary)

  await fhirCdrClient.update({
    resourceType: 'Library',
    id: manifestLibrary.id,
    body: manifestLibrary
  })
  return res.status(200).json(updatedExpansionParameters)
}

export default handler({
  GET: { action: getManifestVersions},
  PUT: { action: updateManifest }
})
