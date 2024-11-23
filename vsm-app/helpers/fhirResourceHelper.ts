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

const addTerminologyEndpointToParameters = (parameters: fhir4.Parameters, address?: string): fhir4.Parameters => {
  const updatedParameters = structuredClone(parameters)
  const endpointWithVsacCredentials: fhir4.Endpoint = {
    resourceType: 'Endpoint',
    extension: [
      { url: 'vsacUsername', valueString: process.env.VSAC_USERNAME },
      { url: 'apiKey', valueString: process.env.VSAC_API_KEY }
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
