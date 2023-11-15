import cloneDeep from "lodash.clonedeep"

type FhirResource = {
  extension?: fhir4.Extension[]
} & fhir4.Resource

const setExtension = (resource: FhirResource , url: string, valueString: string) => {
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

export {
  setExtension
}