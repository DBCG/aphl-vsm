import { cloneDeep } from 'lodash'

interface RelatedArtifactItem {
  url: string
  version?: string
}

interface EditComposeInclude {
  grouperLib: fhir4.Library
  relatedArtifact: RelatedArtifactItem
  action: 'add' | 'remove'
}

export enum USHealthVSPriority {
  'Emergent' = 'emergent',
  'Priority' = 'priority',
  'Routine' = 'routine'
}

const getGrouperLibraryCanonical = (program: fhir4.Library) => {
  return program?.relatedArtifact?.find((related) => related?.resource?.includes('/Library/'))?.resource
}

const setVSPriorityUsageContext = (target: fhir4.Library | fhir4.ValueSet, code: USHealthVSPriority) => {
  const clonedTarget = cloneDeep(target)
  const newUsageContextEntry: fhir4.UsageContext = {
    code: {
      system: 'http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context-type',
      code: 'priority'
    },
    valueCodeableConcept: {
      coding: [
        {
          system: 'http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context-type',
          code
        }
      ]
    }
  }

  if (clonedTarget.useContext) {
    const newUsageContextIndex = Math.max(
      clonedTarget.useContext.findIndex((ctx) => {
        const { system, code } = ctx?.code
        if (system?.endsWith('us-ph-usage-context-type') && code === 'priority') {
          return ctx
        }
      }),
      0
    )
    clonedTarget.useContext[newUsageContextIndex] = newUsageContextEntry
  } else {
    clonedTarget.useContext = [newUsageContextEntry]
  }

  return clonedTarget
}

const getVSPriorityUsageContext = (library: fhir4.Library) => {
  const context = library?.useContext?.find((ctx) => {
    const { system, code } = ctx?.code
    if (system?.endsWith('us-ph-usage-context-type') && code === 'priority') {
      return ctx
    }
  })
  return context?.valueCodeableConcept?.coding?.[0]?.code
}
const getReleaseDescription = (program: fhir4.Library | null | undefined) => {
  // Run some more checks on the type of library
  return program?.extension?.find((ext) => ext?.url?.endsWith('us-ph-specification-release-description-extension'))?.valueString || ''
}

const setReleaseDescription = (program: fhir4.Library, releaseDescription = ''): fhir4.Library => {
  const clonedProgram = cloneDeep(program)
  const newReleaseDescriptionEntry = {
    url: 'http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-specification-release-description-extension',
    valueString: releaseDescription
  }

  if (clonedProgram?.extension == null) {
    clonedProgram.extension = [] as fhir4.Extension[]
  }
  const libraryExtensionIndex = Math.max(
    clonedProgram?.extension?.findIndex((ext) => ext?.url?.endsWith('us-ph-specification-release-description-extension')),
    0
  )

  clonedProgram.extension[libraryExtensionIndex] = newReleaseDescriptionEntry

  return clonedProgram
}

interface ProgHasRequiredFields {
  program: fhir4.Library
  requiredFields: string[]
}

const missingFields = ({ program, requiredFields }: ProgHasRequiredFields): string[] => {
  // this fn returns all required field names that do not have entries
  // @ts-ignore-next-line
  return requiredFields.filter(field => !Boolean(program?.[field]?.trim()))
}

// currently used just for groupers, could make more flexible
// this also doesn't specify deletion by version, deletes all by base url
const editComposeInclude = ({ grouperLib, relatedArtifact, action }: EditComposeInclude): fhir4.Library => {
  const clonedGrouperLib = cloneDeep(grouperLib)
  if (action === 'add') {
    // will be handled in next pr
  } else if (action === 'remove') {
    if (!grouperLib?.relatedArtifact) {
      console.error('No references to groupers exist')
    } else {
      const filteredArtifact = grouperLib.relatedArtifact.filter(
        (x) => !x?.resource?.toLowerCase()?.includes(relatedArtifact?.url?.toLowerCase())
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
  setVSPriorityUsageContext,
  getVSPriorityUsageContext,
  getReleaseDescription,
  setReleaseDescription,
  missingFields,
  editComposeInclude
}
