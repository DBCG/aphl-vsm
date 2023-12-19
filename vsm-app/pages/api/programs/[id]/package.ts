import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import { fhirCdrClient } from 'fhirClients'
import { logSimpleError } from '@/helpers/server/simpleHapiError'
import logger from '@/helpers/server/logger'

export type expectedPackageBody = { parameters: fhir4.Parameters; json: boolean; useV2: boolean }

// this generates a collection Bundle containing all the resources needed to load the artifact and dependencies
// optionally returns in XML
const crmiPackage = async (req: NextApiRequest, res: NextApiResponse<fhir4.Bundle | string | { error: string }>): Promise<void> => {
  const { data, planDefinition } = req.body || ({} as expectedPackageBody)
  const { parameters, json, useV2 } = data
  try {
    let format = json || !useV2 ? 'json' : 'xml' // default to json for v1 as we need bundle to be used in v1 export
    const response = await fetch(`${fhirCdrClient.baseUrl}/Library/${req.query.id as string}/$package?_format=${format}`, {
      body: JSON.stringify(parameters),
      method: 'POST',
      headers: {
        'Content-Type': 'application/fhir+json',
        // should be Basic Auth creds
        ...fhirCdrClient.customHeaders
      }
    }).then((r) => (json || !useV2 ? r.json() : r.text()))

    if (!useV2) {
      format = json ? 'json' : 'xml' // reset to actual format for v1
      logger.info('Generating v2 to v1 transform for download')
      const planDefResourceIndex = response.entry?.findIndex((e) => e.resource?.resourceType === 'PlanDefinition')
      if (planDefResourceIndex === undefined || planDefResourceIndex === -1) {
        response.entry.push({
          fullUrl: planDefinition.url,
          resource: planDefinition
        })
      } else {
        response.entry[planDefResourceIndex].resource = planDefinition
      }

      const v1Response = await fetch(`${fhirCdrClient.baseUrl}/$ersd-v2-to-v1-transform?_format=${format}`, {
        body: JSON.stringify({
          resourceType: 'Parameters',
          parameter: [
            {
              name: 'bundle',
              resource: response
            }
          ]
        }),
        method: 'POST',
        headers: {
          'Content-Type': 'application/fhir+json',
          // should be Basic Auth creds
          ...fhirCdrClient.customHeaders
        }
      }).then((r) => (json ? r.json() : r.text()))

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
