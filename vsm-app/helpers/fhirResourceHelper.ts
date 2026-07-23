import { tsCredentialService } from '@/backend/services/TsCredentialService'
import { cloneDeep } from 'lodash'

type FhirResource = {
  extension?: fhir4.Extension[]
} & fhir4.Resource

const setExtension = (resource: FhirResource, url: string, valueString: string) => {
  const clonedResource = cloneDeep(resource)
  const newExtensionEntry = {
    url,
    valueString
  }

  if (clonedResource?.extension == null) {
    clonedResource.extension = [] as fhir4.Extension[]
  }
  const libraryExtensionIndex = clonedResource?.extension?.findIndex((ext) => ext?.url === url)

  if (libraryExtensionIndex === -1) {
    clonedResource.extension.push(newExtensionEntry)
  } else {
    clonedResource.extension[libraryExtensionIndex] = newExtensionEntry
  }

  return clonedResource
}

type AddTerminologyEndpointToParameters = {
  parameters: fhir4.Parameters;
  address?: string;
  userId: string;
}

const addTerminologyEndpointToParameters = async ({parameters, address, userId }: AddTerminologyEndpointToParameters): Promise<fhir4.Parameters> => {
  let vsCreds
  try {
    vsCreds = await tsCredentialService.getVsacCredentials(userId)
  } catch {
    // No credentials stored — proceed without a terminology endpoint
    return parameters
  }

  const updatedParameters = structuredClone(parameters)
  const endpointWithVsacCredentials: fhir4.Endpoint = {
    resourceType: 'Endpoint',
    header: [
        "Authorization: Basic " + Buffer.from("apikey:" + vsCreds.password).toString("base64"),
    ],
    address: address || process.env.NEXT_PUBLIC_VSAC_BASE_URL || '',
    connectionType: { system: 'http://hl7.org/fhir/ValueSet/endpoint-connection-type', code: 'hl7-fhir-rest' },
    status: 'active',
    payloadType: [{ coding: [{ system: 'http://hl7.org/fhir/ValueSet/endpoint-payload-type', code: 'any' }] }]
  }
  updatedParameters.parameter ??= []
  updatedParameters.parameter?.push({
    name: 'terminologyEndpoint',
    resource: endpointWithVsacCredentials
  })
  return updatedParameters
}

export { setExtension, addTerminologyEndpointToParameters }
