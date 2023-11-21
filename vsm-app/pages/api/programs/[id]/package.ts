import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import { fhirCdrClient } from 'fhirClients'
import { logSimpleError } from '@/helpers/server/simpleHapiError'
import logger from '@/helpers/server/logger'

export type expectedPackageBody = { parameters: fhir4.Parameters; json: boolean; useV2: boolean }

// this generates a collection Bundle containing all the resources needed to load the artifact and dependencies
// optionally returns in XML
const crmiPackage = async (req: NextApiRequest, res: NextApiResponse<fhir4.Bundle | string | { error: string }>): Promise<void> => {
  const { parameters, json, useV2 } = JSON.parse(req.body || {}) as expectedPackageBody
  try {
    const format = json ? 'json' : 'xml'
    const response = await fetch(`${fhirCdrClient.baseUrl}/Library/${req.query.id as string}/$crmi.package?_format=${format}`, {
      body: JSON.stringify(parameters),
      method: 'POST',
      headers: {
        'Content-Type': 'application/fhir+json',
        // should be Basic Auth creds
        ...fhirCdrClient.customHeaders
      }
    }).then((r) => json ? r.json() : r.text())

    if (!useV2) {
      logger.info('Generating v2 to v1 transform for download')
      const planDefResource = response.entry?.find((e) => e.resource?.resourceType === 'PlanDefinition')?.resource

      if (response == null || planDefResource == null) {
        logger.error('Could not find either Plan Def or bundle in response')
        return res.status(500).json({ error: 'Failed to export' })
      }
      const v1Response = await fetch(
        `${fhirCdrClient.baseUrl}/Library/${req.query.id as string}/$ersd-v2-to-v1-transform?_format=${format}`,
        {
          body: JSON.stringify({
            resourceType: 'Parameters',
            parameter: [
              {
                name: 'bundle',
                resource: response
              },
              {
                name: 'planDefinition',
                resource: planDefResource
              }
            ]
          }),
          method: 'POST',
          headers: {
            'Content-Type': 'application/fhir+json',
            // should be Basic Auth creds
            ...fhirCdrClient.customHeaders
          }
        }
      ).then((r) => json ? r.json() : r.text())

      res.send(v1Response)
    } else {
      res.send(response)
    }
  } catch (error: any) {
    logSimpleError(error)
    const diagnostics = error?.response?.data?.issue?.[0]?.diagnostics
    return res.status(500).json({ error: diagnostics || error?.error || error || 'Unspecified error' })
  }
}

export default handler({
  POST: {
    action: crmiPackage,
    access: ['admin']
  }
})
