import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import { fhirCdrClient } from 'fhirClients'
import { logSimpleError } from '@/helpers/server/simpleHapiError'
import logger from '@/helpers/server/logger'
import { formatErrors } from '@/helpers/server/operationOutcomeHelpers'

export interface ExpectedPackageBody {
  data?: {
    parameters: fhir4.Parameters
    json: boolean
    useV2: boolean
  }
  planDefinition?: fhir4.PlanDefinition
  targetVersion?: string
}
// this generates a collection Bundle containing all the resources needed to load the artifact and dependencies
// optionally returns in XML
const crmiPackage = async (req: NextApiRequest, res: NextApiResponse<fhir4.Bundle | string | { error: string | string[] }>): Promise<void> => {
  const { data, planDefinition, targetVersion } = (req.body || {}) as ExpectedPackageBody
  const parameters = data?.parameters
  const json = data?.json
  const useV1 = !data?.useV2
  try {
    let format = json || useV1 ? 'json' : 'xml' // default to json for v1 as we need bundle to be used in v1 export
    const response = await fetch(`${fhirCdrClient.baseUrl}/Library/${req.query.id as string}/$package?_format=${format}`, {
      body: JSON.stringify(parameters),
      method: 'POST',
      headers: {
        'Content-Type': 'application/fhir+json',
        // should be Basic Auth creds
        ...fhirCdrClient.customHeaders
      }
    }).then((r) => (json || useV1 ? r.json() : r.text()))

    if (useV1) {
      format = json ? 'json' : 'xml' // reset to actual format for v1
      logger.info('Generating v2 to v1 transform for download')

      const planDefResourceIndex = response.entry?.findIndex((e: fhir4.BundleEntry) => e.resource?.resourceType === 'PlanDefinition')
      const planDefFromV2Exist = planDefResourceIndex ==! undefined && planDefResourceIndex ==! !-1
      if (response.resourceType === 'OperationOutcome') {
        return res.status(500).send({ error: response?.issue?.map((e: any) => e?.diagnostics!) || 'Error encountered while packaging V1' })
      }
      // if planDefinition is provided in the request, use it to replace the one from the v2 package response
      else if (!planDefFromV2Exist && planDefinition != null) {
        response.entry.push({
          fullUrl: planDefinition?.url,
          resource: planDefinition
        })
      // if planDefinition is provided in the request, use it to replace the one from the v2 package response
      } else if (planDefFromV2Exist && planDefinition != null) {
        response.entry[planDefResourceIndex].resource = planDefinition
      } else if(!planDefFromV2Exist && planDefinition == null) {
        logger.error('No PlanDefinition resource found in package response nor was uploaded as part of the request')
        return res
          .status(400)
          .json({ error: 'No PlanDefinition resource found in v2 package response nor was uploaded as part of the request' })
      }
      const v1BundleBody: fhir4.Parameters = {
        resourceType: 'Parameters',
        parameter: [
          {
            name: 'bundle',
            resource: response
          }
        ]
      }

      if (targetVersion && targetVersion?.length > 0) {
        v1BundleBody.parameter?.push({
          name: 'targetVersion',
          valueString: targetVersion
        })
      }

      const v1Response = await fetch(`${fhirCdrClient.baseUrl}/$ersd-v2-to-v1-transform?_format=${format}`, {
        body: JSON.stringify(v1BundleBody),
        method: 'POST',
        headers: {
          'Content-Type': 'application/fhir+json',
          // should be Basic Auth creds
          ...fhirCdrClient.customHeaders
        }
      }).then((r) => (json ? r.json() : r.text()))
      const v1Errors = formatErrors(v1Response)

      if (v1Errors.length) {
        return res.status(500).send({ error: v1Errors.map(e => e.diagnostics!) })
      }
      res.send(v1Response)
    } else {
      const v2Errors = formatErrors(response)
      if (v2Errors.length) {
        return res.status(500).send({ error: v2Errors.map(e => e.diagnostics!) })
      }
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
