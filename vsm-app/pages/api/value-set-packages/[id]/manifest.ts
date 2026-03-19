import type { NextApiRequest, NextApiResponse } from 'next'
import TerminologyFhirClient from '@/backend/clients/TerminologyFhirClient'
import { logSimpleError } from '@/helpers/server/simpleHapiError'
import handler from '@/helpers/server/handler'
import FhirClient from '@/backend/clients/FhirCdrClient'
import { getVSPManifestVersions, setExpansionParametersForVSP } from '@/helpers/valueSetHelpers'
import Logger from '@/helpers/server/logger'
import { isImplementer, VSMSession } from '@/helpers/rolesHelper'
import { ExtendedManifestData } from '@/types/vspTypes'

/**
 * GET: Fetch available versions for CodeSystems or ValueSets from terminology server
 * Supports ?resourceType=CodeSystem|ValueSet and ?url=... parameters
 */
const getManifestVersions = async (req: NextApiRequest, res: NextApiResponse, session: VSMSession) => {
  const userId = session.user.id

  if (isImplementer(session)) {
    const vsp = (await FhirClient.getInstance().read({
      resourceType: 'Library',
      id: req.query.id as string
    })) as fhir4.Library
    if (vsp?.status === 'draft') {
      return res.status(403).json({ error: 'Access denied' })
    }
  }

  const vsacFhirClient = await TerminologyFhirClient.getClient(userId)
  const resourceType = (req.query.resourceType as string) || 'CodeSystem'

  try {
    // If URL is provided, get versions for that specific CodeSystem or ValueSet
    if (req.query.url) {
      const results = await vsacFhirClient?.search({
        resourceType: resourceType as 'CodeSystem' | 'ValueSet',
        searchParams: {
          // For CodeSystem: search by system parameter
          // For ValueSet: search by url parameter
          ...(resourceType === 'CodeSystem' ? { system: req.query.url } : { url: req.query.url })
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

    // Get all available CodeSystems or ValueSets from capability statement
    if (resourceType === 'CodeSystem') {
      const terminologyCapabilityStatement = await vsacFhirClient?.capabilityStatement()
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
    } else if (resourceType === 'ValueSet') {
      // For ValueSets, search all available ValueSets
      // Note: VSAC doesn't support _summary parameter, so we fetch full resources
      const results = await vsacFhirClient?.search({
        resourceType: 'ValueSet',
        searchParams: {
          _count: 500  // Reduce count since we're fetching full resources
        }
      })

      const availableValueSets = results?.entry?.map((i: fhir4.BundleEntry) => {
        const vs = i.resource as fhir4.ValueSet
        return {
          uri: vs.url,
          name: vs.name || vs.title,
          latestVersion: vs.version
        }
      }).filter((x: any) => x.uri && x.name)

      return res.status(200).json(availableValueSets)
    }

    return res.status(400).json({ error: 'Invalid resourceType. Must be CodeSystem or ValueSet' })

  } catch (e) {
    Logger.getLogger().error('An error occurred fetching manifest versions from terminology server')
    logSimpleError(e)
    return res.status(400).json({ 'server-error': 'Manifest version search failed.' })
  }
}

/**
 * POST: Validate and get latest versions for specified CodeSystems or ValueSets
 * Body should be a map of { "system/canonical": "version" }
 */
const validateManifestVersions = async (req: NextApiRequest, res: NextApiResponse, session: VSMSession) => {
  const userId = session.user.id
  const resourceType = (req.query.resourceType as string) || 'CodeSystem'

  try {
    const activeTerminologyClient = await TerminologyFhirClient.getClient(userId)

    // Batch lookup versions
    const latestVersions = await activeTerminologyClient?.batch({
      body: {
        resourceType: 'Bundle',
        type: 'batch',
        entry: Object.entries(req.body).map((i) => {
          const [systemOrCanonical, version] = i

          if (resourceType === 'CodeSystem') {
            return {
              request: {
                method: 'GET',
                url: `/CodeSystem?system=${systemOrCanonical}&version=${version}`
              }
            }
          } else {
            return {
              request: {
                method: 'GET',
                url: `/ValueSet?url=${systemOrCanonical}&version=${version}`
              }
            }
          }
        })
      }
    })

    // Parse bundle of bundles into list of resources
    //@ts-ignore
    const validatedVersions = latestVersions?.entry?.map((i) => ({
      [resourceType === 'CodeSystem' ? 'system' : 'canonical']: i.resource?.entry?.[0]?.resource?.url,
      version: i.resource?.entry?.[0]?.resource?.version
    }))

    return res.status(200).json(validatedVersions)
  } catch (e: any) {
    const message = e?.message
    Logger.getLogger().error('error: ' + message)
    return res.status(400).json({ error: message })
  }
}

/**
 * PUT: Update the manifest (expansion parameters) for a VSP
 * Body should be ExtendedManifestData with both codeSystems and valueSets
 */
const updateManifest = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const vspLibrary = (await FhirClient.getInstance().read({
      resourceType: 'Library',
      id: req.query.id as string
    })) as fhir4.Library

    // Only draft VSPs can have manifest updated
    if (vspLibrary.status === 'active') {
      return res.status(400).json({ 'server-error': 'Cannot update manifest on an active Value Set Package.' })
    }

    if (vspLibrary.status === 'retired') {
      return res.status(400).json({ 'server-error': 'Cannot update manifest on a retired Value Set Package.' })
    }

    // Update manifest with both CodeSystem and ValueSet versions
    const manifestData: ExtendedManifestData = req.body
    setExpansionParametersForVSP(vspLibrary, manifestData)
    const updatedManifest = getVSPManifestVersions(vspLibrary)

    // Save updated VSP
    await FhirClient.getInstance().update({
      resourceType: 'Library',
      id: vspLibrary.id,
      body: vspLibrary
    })

    return res.status(200).json(updatedManifest)
  } catch (e: any) {
    Logger.getLogger().error('Error updating VSP manifest:', e)
    logSimpleError(e)
    return res.status(500).json({ error: e.message || 'Failed to update manifest' })
  }
}

export default handler({
  GET: { access: ['admin', 'publisher', 'editor', 'reviewer', 'implementer'], action: getManifestVersions },
  PUT: { access: ['admin', 'publisher', 'editor'], action: updateManifest },
  POST: { access: ['admin', 'publisher', 'editor'], action: validateManifestVersions }
})
