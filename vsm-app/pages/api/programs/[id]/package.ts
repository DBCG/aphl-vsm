import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import { fhirCdrClient } from 'fhirClients'
import { logSimpleError } from '@/helpers/server/simpleHapiError'
import logger from '@/helpers/server/logger'
import { formatErrors } from '@/helpers/server/operationOutcomeHelpers'
import sanitizeExport from '@/helpers/sanitizeExportHelper'

export interface ExpectedPackageBody extends NextApiRequest {
  body: {
    data?: {
      parameters: fhir4.Parameters
      json: boolean
      useV2: boolean
    }
    planDefinition?: fhir4.PlanDefinition
    targetVersion?: string
  }
}
export type PackageResponse = fhir4.Bundle | string | { error: string }
// this generates a collection Bundle containing all the resources needed to load the artifact and dependencies
// optionally returns in XML
const crmiPackage = async (
  req: ExpectedPackageBody,
  res: NextApiResponse<PackageResponse>): Promise<void> => {
  const { data, planDefinition, targetVersion } = (req.body || {})
  if (!data?.parameters) {
    throw new Error("Missing parameters for Export")
  }
  const parameters = addTerminologyEndpointToParameters(data?.parameters)
  const json = data?.json ? 'json' : 'xml'
  const useV1 = !data?.useV2
  try {
    let format = useV1 ? 'json' : json // force json for v1 so we can pass it back to the server to convert to v2
    let response = await fetch(`${fhirCdrClient.baseUrl}/Library/${req.query.id as string}/$package?_format=${format}`, {
      body: JSON.stringify(parameters),
      method: 'POST',
      headers: {
        'Content-Type': 'application/fhir+json',
        // should be Basic Auth creds
        ...fhirCdrClient.customHeaders
      }
    })
      .then((r) => {
        if (r.ok) {
          return data?.json || useV1 ? r.json() : r.text() as Promise<fhir4.Bundle | fhir4.OperationOutcome | string>
        } else {
          throw new Error("Unknown error executing package")
        }
      })
      .catch((err) => {
        logSimpleError(err)
        if ("cause" in err) {
          throw err.cause
        } else {
          throw err
        }
      })

    if (useV1) {
      if (typeof response === 'string') {
        throw new Error("Got string (XML?) response but expected FHIR JSON")
      }
      if (response.resourceType === 'OperationOutcome') {
        return res.status(500).send({ error: response?.issue?.map((e) => e?.diagnostics!).join(", ") || 'Error encountered while packaging V1' })
      }
      try {
        response = await convertV2toV1(
          response,
          format = json, // reset to actual format for v1
          planDefinition,
          targetVersion
        )
      } catch (error: any) {
        // print V2/V1 errors
        if (typeof error === "string") {
          return res.status(400).send({ error })
        } else {
          throw error
        }
      }
    }
    if ((typeof response !== "string" && response.resourceType === 'OperationOutcome')
      || (typeof response === "string" && response.startsWith("<OperationOutcome"))) {
      const errors = formatErrors(response)
      return res.status(500).send({ error: errors.map(e => e.diagnostics!).join(", ") })
    }
    res.send(sanitizeExport(response))
  } catch (error: any) {
    logSimpleError(error)
    const diagnostics = error?.response?.data?.issue?.[0]?.diagnostics
    return res.status(500).json({ error: diagnostics || error?.error || error.toString() || 'Unspecified error' })
  }
}
async function convertV2toV1(v2: fhir4.Bundle, format: 'json' | 'xml', planDefinition?: fhir4.PlanDefinition, targetVersion?: string) {
  if (!v2.entry) {
    throw 'Empty bundle returned from server'
  }
  logger.info('Generating v2 to v1 transform for download')

  const planDefResourceIndex = v2.entry.findIndex((e: fhir4.BundleEntry) => e.resource?.resourceType === 'PlanDefinition')
  const planDefFromV2Exist = planDefResourceIndex != null && planDefResourceIndex > -1

  // if planDefinition is provided in the request, and not present then add it to bundle entry
  if (!planDefFromV2Exist && planDefinition != null) {
    v2.entry.push({
      fullUrl: planDefinition?.url,
      resource: planDefinition
    })
    // if planDefinition is provided in the request, use it to replace the one from the v2 package response
  } else if (planDefFromV2Exist && planDefinition != null) {
    v2.entry[planDefResourceIndex].resource = planDefinition
  } else if (!planDefFromV2Exist && planDefinition == null) {
    logger.error('No PlanDefinition resource found in package response nor was uploaded as part of the request')
    throw 'No PlanDefinition resource found in v2 package response nor was uploaded as part of the request'
  }
  const v1BundleBody: fhir4.Parameters = {
    resourceType: 'Parameters',
    parameter: [
      {
        name: 'bundle',
        resource: v2
      }
    ]
  }

  if (targetVersion && targetVersion?.length > 0) {
    v1BundleBody.parameter?.push({
      name: 'targetVersion',
      valueString: targetVersion
    })
  }

  return fetch(`${fhirCdrClient.baseUrl}/$ersd-v2-to-v1-transform?_format=${format}`, {
    body: JSON.stringify(v1BundleBody),
    method: 'POST',
    headers: {
      'Content-Type': 'application/fhir+json',
      // should be Basic Auth creds
      ...fhirCdrClient.customHeaders
    }
  }).then((r) => (format === 'json' ? r.json() : r.text()) as Promise<fhir4.Bundle | fhir4.OperationOutcome | string>)
}
export function addTerminologyEndpointToParameters(parameters: fhir4.Parameters, address?: string): fhir4.Parameters {
  const updatedParameters = structuredClone(parameters)
  const endpointWithVsacCredentials: fhir4.Endpoint = {
    resourceType: "Endpoint",
    extension: [
      { url: "vsacUsername", valueString: process.env.VSAC_USERNAME },
      { url: "apiKey", valueString: process.env.VSAC_API_KEY },
    ],
    address: address || process.env.NEXT_PUBLIC_VSAC_BASE_URL || "",
    connectionType: { system: "http://hl7.org/fhir/ValueSet/endpoint-connection-type", code: "hl7-fhir-rest" },
    status: "active",
    payloadType: [{ coding: [{ system: "http://hl7.org/fhir/ValueSet/endpoint-payload-type", code: "any" }] }]
  }
  updatedParameters.parameter ??= []
  updatedParameters.parameter?.push({
    name: "terminologyEndpoint",
    resource: endpointWithVsacCredentials
  })
  return updatedParameters
}

export default handler({
  POST: {
    action: crmiPackage,
    access: ['admin']
  }
})