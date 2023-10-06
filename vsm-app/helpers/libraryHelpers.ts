import { cloneDeep } from 'lodash'
import { generateNameFromTitle } from './stringHelpers'

interface RelatedArtifactItem {
  url: string
  version?: string
  extension?: fhir4.Extension[]
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
          system: 'http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context',
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
  return program?.extension?.find((ext) => ext?.url?.endsWith('artifact-releaseDescription'))?.valueString || ''
}

const setReleaseDescription = (program: fhir4.Library, releaseDescription: string = ''): fhir4.Library => {
  const releaseDescriptionExtensionUrl = 'http://hl7.org/fhir/StructureDefinition/artifact-releaseDescription'
  return setExtension(program, releaseDescriptionExtensionUrl, releaseDescription)
}

const setEffectivePeriodStart = (program: fhir4.Library, date: any) => {
  if (typeof date === 'string') {
    const clonedProgram = cloneDeep(program)
    clonedProgram.effectivePeriod = { start: date }
    return clonedProgram
  }
  return program
}

const setTitleAndDerivedName = (program: fhir4.Library, title: string | undefined, defaultName: string) => {
  const clonedProgram = cloneDeep(program)
  if (title) {
    clonedProgram.title = title
  }
  clonedProgram.name = generateNameFromTitle(title, defaultName)
  return clonedProgram
}

interface MissingFields {
  program: fhir4.Library
  requiredFields: string[]
}

const missingFields = ({ program, requiredFields }: MissingFields): string[] => {
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

const getReleaseLabel = (program: fhir4.Library | null | undefined) => {
  return program?.extension?.find((ext) => ext?.url === 'http://hl7.org/fhir/StructureDefinition/artifact-releaseLabel')?.valueString || ''
}

const setExtension = (program: fhir4.Library, url: string, valueString: string) => {
  const clonedProgram = cloneDeep(program)
  const newExtensionEntry = {
    url,
    valueString
  }

  if (clonedProgram?.extension == null) {
    clonedProgram.extension = [] as fhir4.Extension[]
  }
  const libraryExtensionIndex = clonedProgram?.extension?.findIndex((ext) => ext?.url === url)

  if (libraryExtensionIndex === -1) {
    clonedProgram.extension.push(newExtensionEntry)
  } else {
    clonedProgram.extension[libraryExtensionIndex] = newExtensionEntry
  }

  return clonedProgram
}

const setReleaseLabel = (program: fhir4.Library, label: string = '') => {
  const releaseLabelExtensionUrl = 'http://hl7.org/fhir/StructureDefinition/artifact-releaseLabel'
  return setExtension(program, releaseLabelExtensionUrl, label)
}

// effectiveStartDate must be valid date and today or later
const validStartDate = (date: any): boolean => {
  const parsedDate = Date?.parse(date)
  // early return to prevent typeErrors if not valid date
  if (isNaN(parsedDate)) return false

  const today = new Intl.DateTimeFormat("fr-CA", {year: "numeric", month: "2-digit", day: "2-digit"}).format(Date.now())
  const parsedToday = Date.parse(today)
  // only allow today or future
  return (parsedDate - parsedToday > -1)
}

export {
  getGrouperLibraryCanonical,
  setVSPriorityUsageContext,
  getVSPriorityUsageContext,
  getReleaseDescription,
  setReleaseDescription,
  missingFields,
  editComposeInclude,
  getReleaseLabel,
  setReleaseLabel,
  setTitleAndDerivedName,
  setEffectivePeriodStart,
  validStartDate
}
