import { cloneDeep } from 'lodash'

interface RelatedArtifactItem {
  url: string,
  version?: string
}

interface editRelatedArtifacts {
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
// this doesn't specify deletion by version, deletes all by base url
const editRelatedArtifacts = ({ grouperLib, relatedArtifact, action }: editRelatedArtifacts): fhir4.Library => {
  const clonedGrouperLib = cloneDeep(grouperLib)
  if (action === 'add') {
    const resourceUrl = `${relatedArtifact.url}`.concat(relatedArtifact.version ? `|${relatedArtifact.version}` : '')
    const resourceToAdd = {
      type: 'composed-of',
      resource: resourceUrl
    } as fhir4.RelatedArtifact

    if (!grouperLib.relatedArtifact) {
      clonedGrouperLib.relatedArtifact = [resourceToAdd]
    } else {
      let updatedRelatedArtifacts = clonedGrouperLib.relatedArtifact?.filter(item => (
        item?.resource?.split('|')?.[0] !== (relatedArtifact?.url)
      ))

      updatedRelatedArtifacts?.push(resourceToAdd)

      clonedGrouperLib.relatedArtifact = updatedRelatedArtifacts
    }
  } else if (action === 'remove') {
    if (!grouperLib?.relatedArtifact) {
      console.error('No references to groupers exist')
    } else {
      const filteredArtifact = grouperLib.relatedArtifact.filter(
        x => !x?.resource?.toLowerCase()?.includes(relatedArtifact?.url?.toLowerCase())
      )
      if (filteredArtifact.length === 0) {
        delete clonedGrouperLib.relatedArtifact
      } else {
        clonedGrouperLib.relatedArtifact = filteredArtifact
      }
    }
  }
  return clonedGrouperLib
}


export {
  getGrouperLibraryCanonical,
  getReleaseDescription,
  setReleaseDescription,
  progHasRequiredFields,
  editRelatedArtifacts
}