import { cloneDeep } from 'lodash'

const getGrouperLibraryCanonical = (program: fhir4.Library) => {
  return program.relatedArtifact
    ?.find(related => related.resource?.includes('/Library/'))
    ?.resource
}

const getReleaseDescription = (program: fhir4.Library | null | undefined) => {
  // Run some more checks on the type of library
  return program?.extension
    ?.find(ext => ext?.url?.endsWith('us-ph-specification-release-description-extension'))
    ?.valueString || ""
}

const setReleaseDescription = (program: fhir4.Library, releaseDescription = ''): fhir4.Library => {
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

interface ProgHasRequiredFields {
  program: fhir4.Library,
  requiredFields: string[]
}

const progHasRequiredFields = ({ program, requiredFields }: ProgHasRequiredFields): boolean => (
  // @ts-ignore-next-line
  requiredFields.every(field => Boolean(program?.[field]?.trim()))
)

export {
  getGrouperLibraryCanonical,
  getReleaseDescription,
  setReleaseDescription,
  progHasRequiredFields
}