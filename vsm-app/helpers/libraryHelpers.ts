import { cloneDeep } from 'lodash'

const getGrouperLibraryCanonical = (program: fhir4.Library) => {
  return program.relatedArtifact
    ?.find(related => related.resource?.includes('/Library/'))
    ?.resource
}

const getReleaseDescription = (program: fhir4.Library | null) => {
  // Run some more checks on the type of library
  return program?.extension
    ?.find(ext => ext?.url?.endsWith('us-ph-specification-release-description-extension'))
    ?.valueString || ""
}

const setReleaseDescription = (program: fhir4.Library, releaseDescription = '') => {
  const clonedProgram = cloneDeep(program)
  const newReleaseDescriptionEntry = {
    "url": "http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-specification-release-description-extension",
    "valueString": releaseDescription
  }

  if (clonedProgram?.extension == null) {
    clonedProgram.extension = [] as fhir4.Extension[]
  }
  const libraryExtensionIndex = Math.max(clonedProgram
    ?.extension
    ?.findIndex(ext => ext?.url?.endsWith('us-ph-specification-release-description-extension')), 0)

  clonedProgram.extension[libraryExtensionIndex] = newReleaseDescriptionEntry

  return clonedProgram
}

export {
  getGrouperLibraryCanonical,
  getReleaseDescription,
  setReleaseDescription
}