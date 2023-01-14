import { cloneDeep } from 'lodash'

interface RelatedArtifactItem {
  url: string,
  version?: string
}

interface EditComposeInclude {
  grouperLib: fhir4.Library
  relatedArtifact: RelatedArtifactItem
  action: 'add' | 'remove'
}

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

// currently used just for groupers, could make more flexible
// this also doesn't specify deletion by version, deletes all by base url
const editComposeInclude = ({ grouperLib, relatedArtifact, action }: EditComposeInclude): fhir4.Library => {
  if (action === 'add') {

  } else if (action === 'remove') {
    if (!grouperLib?.relatedArtifact) {
    } else {
      const filteredArtifact = grouperLib.relatedArtifact.filter(
        x => !x?.resource?.toLowerCase()?.includes(relatedArtifact?.url?.toLowerCase())
      )
      if (filteredArtifact.length === 0) {
        delete grouperLib.relatedArtifact
      } else {
        grouperLib.relatedArtifact = filteredArtifact
      }
    }
  }
  return grouperLib
}

export {
  getGrouperLibraryCanonical,
  getReleaseDescription,
  setReleaseDescription,
  progHasRequiredFields,
  editComposeInclude
}