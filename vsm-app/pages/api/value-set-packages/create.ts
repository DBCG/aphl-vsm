import type { NextApiRequest, NextApiResponse } from 'next'
import FhirClient from '@/backend/clients/FhirCdrClient'
import handler from '@/helpers/server/handler'
import Logger from '@/helpers/server/logger'
import { logSimpleError } from '@/helpers/server/simpleHapiError'
import { constructVSPUrl, constructVSPId, generateVSPName, generateVSPTitle, validateVSPVersion } from '@/helpers/vspHelpers'
import { VSPMetadata, CreateVSPRequest, ExtendedManifestData } from '@/types/vspTypes'
import { setExpansionParametersForVSP } from '@/helpers/valueSetHelpers'

const createVSP = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const body: CreateVSPRequest = req.body
    Logger.getLogger().info('Creating VSP with body: ' + JSON.stringify(body, null, 2))

    // Validate required fields
    if (!body.igCanonical || !body.vspVersion || !body.igPackageId) {
      return res.status(400).json({ error: 'Missing required fields: igCanonical, vspVersion, and igPackageId are required' })
    }

    // Validate VSP version format
    if (!validateVSPVersion(body.vspVersion)) {
      return res.status(400).json({ error: 'Invalid vspVersion format. Must be YYYY-MM (e.g., "2026-01")' })
    }

    // Parse IG canonical to extract URL and version
    const [igUrl, igVersion] = body.igCanonical.split('|')
    if (!igVersion) {
      return res.status(400).json({ error: 'IG canonical must include version (e.g., "http://hl7.org/fhir/us/core/ImplementationGuide/hl7.fhir.us.core|6.1.0")' })
    }

    // Validate experimental flag against IG
    // VSP can be experimental=true regardless, but cannot be false if IG is true
    if (body.igExperimental && !body.experimental) {
      return res.status(400).json({ error: 'VSP cannot be experimental=false when IG is experimental=true' })
    }

    // Construct VSP metadata
    const vspMetadata: VSPMetadata = {
      igCanonical: body.igCanonical,
      igUrl,
      igVersion,
      igPackageId: body.igPackageId,
      igName: body.igName,
      igTitle: body.igTitle,
      igExperimental: body.igExperimental,
      vspVersion: body.vspVersion,
      experimental: body.experimental,
      status: 'draft'
    }

    // Construct VSP URL and ID
    const vspUrl = constructVSPUrl(vspMetadata)
    const vspId = constructVSPId(body.igPackageId, body.vspVersion)

    Logger.getLogger().info(`Constructed VSP URL: ${vspUrl}`)
    Logger.getLogger().info(`Constructed VSP ID: ${vspId}`)

    // Check if VSP with this ID already exists
    try {
      const existing = await FhirClient.getInstance().read({
        resourceType: 'Library',
        id: vspId
      })
      if (existing) {
        return res.status(409).json({
          error: `Value Set Package with ID "${vspId}" already exists. Please use a different version.`
        })
      }
    } catch (e: any) {
      // 404 is expected if VSP doesn't exist - that's good
      if (e.response?.status !== 404) {
        throw e
      }
    }

    // Create FHIR Library resource
    const vspLibrary: fhir4.Library = {
      resourceType: 'Library',
      id: vspId,
      url: vspUrl,
      version: body.vspVersion,
      name: generateVSPName(body.igName, igVersion),
      title: generateVSPTitle(body.igTitle, igVersion),
      status: 'draft',
      experimental: body.experimental,
      type: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/library-type',
          code: 'asset-collection'
        }]
      },
      useContext: [{
        code: {
          system: 'http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context-type',
          code: 'specification-type'
        },
        valueCodeableConcept: {
          coding: [{
            system: 'http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context',
            code: 'value-set-package'
          }]
        }
      }],
      relatedArtifact: [{
        type: 'composed-of',
        resource: body.igCanonical
      }]
    }

    // Set manifest if provided
    if (body.manifestData) {
      setExpansionParametersForVSP(vspLibrary, body.manifestData)
    }

    Logger.getLogger().info('VSP Library resource to create: ' + JSON.stringify(vspLibrary, null, 2))

    // Create in FHIR CDR
    Logger.getLogger().info('Calling FHIR client to create VSP...')
    const result = await FhirClient.getInstance().create({
      resourceType: 'Library',
      body: vspLibrary
    })
    Logger.getLogger().info('FHIR client returned: ' + JSON.stringify(result, null, 2))

    Logger.getLogger().info(`Created VSP: ${vspId}`)
    return res.status(201).json({
      vspId: result.id,
      url: vspUrl,
      message: 'Value Set Package created successfully'
    })
  } catch (error: any) {
    Logger.getLogger().error('Error creating VSP:', error)
    Logger.getLogger().error('Error stack:', error.stack)
    Logger.getLogger().error('Error response:', error.response?.data)
    logSimpleError(error)

    // Provide more detailed error message
    const errorMessage = error.response?.data?.issue?.[0]?.diagnostics
      || error.message
      || 'Failed to create Value Set Package'

    return res.status(500).json({
      error: errorMessage,
      details: error.response?.data || error.message
    })
  }
}

export default handler({
  POST: { access: ['admin', 'editor'], action: createVSP }
})
