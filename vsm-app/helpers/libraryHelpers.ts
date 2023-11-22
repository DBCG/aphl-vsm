import { cloneDeep } from 'lodash'
import { capitalizeFirstLetter, generateNameFromTitle } from './stringHelpers'

interface RelatedArtifactItem {
  url: string
  version?: string
  extension?: fhir4.Extension[]
}

export enum USHealthVSPriority {
  'Emergent' = 'emergent',
  'Routine' = 'routine'
}

interface EditComposeInclude {
  grouperLib: fhir4.Library
  relatedArtifact: RelatedArtifactItem
  action: 'add' | 'remove'
}

const getGrouperLibraryCanonical = (program: fhir4.Library) => {
  return program?.relatedArtifact?.find((related) => related?.resource?.includes('/Library/'))?.resource
}

const getReleaseDescription = (program: fhir4.Library | null | undefined) => {
  // Run some more checks on the type of library
  return program?.extension?.find((ext) => ext?.url?.endsWith('artifact-releaseDescription'))?.valueString || ''
}

const setReleaseDescription = (program: fhir4.Library, releaseDescription: string = ''): fhir4.Library => {
  const releaseDescriptionExtensionUrl = 'http://hl7.org/fhir/StructureDefinition/artifact-releaseDescription'
  return setExtension(program, releaseDescriptionExtensionUrl, releaseDescription)
}

const setEffectivePeriodStart = (program: fhir4.Library, date: string) => {
  const clonedProgram = cloneDeep(program)
  clonedProgram.effectivePeriod = { start: date }
  return clonedProgram
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
  return requiredFields.filter((field) => !Boolean(program?.[field]?.trim()))
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

  const [year, month, day] = date.split('-')
  const today = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/New_York'
  }).format(Date.now())
  const [monthToday, dayToday, yearToday] = today.split('/')

  const testDate = Number(`${year}${month.padStart(2, '0')}${day.padStart(2, '0')}`)
  const todayDate = Number(`${yearToday}${monthToday}${dayToday}`)

  return testDate - todayDate > -1
}

const setVSPriority = (target: fhir4.Library, code: USHealthVSPriority, resource: string) => {
  const clonedTarget = cloneDeep(target)
  const newPriority = {
    extension: [
      {
        url: 'http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-priority',
        valueCodeableConcept: {
          coding: [
            {
              system: 'http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context',
              code
            }
          ],
          text: capitalizeFirstLetter(code)
        }
      },
    ],
    type: 'depends-on',
    resource
  }

  const exisitingIndex = clonedTarget?.relatedArtifact?.findIndex((ctx) => {
    if (ctx?.extension?.[0]?.url?.endsWith('vsm-valueset-priority') && ctx?.resource === resource) {
      return ctx
    }
  }) || -1

  if (exisitingIndex > -1 && clonedTarget.relatedArtifact) {
    // @ts-ignore
    clonedTarget.relatedArtifact[exisitingIndex] = newPriority
  } else {
    // @ts-ignore
    clonedTarget.relatedArtifact?.push(newPriority)
  }

  return clonedTarget
}

const getVSPriority = (library: fhir4.Library) => {
  const vsPriorityMap = {} as Record<string, USHealthVSPriority>
  library?.relatedArtifact?.forEach((ra) => {
    if (ra.type === 'depends-on' && ra.extension?.[0]?.url?.endsWith('vsm-valueset-priority')) {
      const vs = ra.resource
      const priority = ra.extension?.[0]?.valueCodeableConcept?.coding?.[0]?.code as USHealthVSPriority
      if (vs && priority) {
        vsPriorityMap[vs] = priority
      }
    }
  })
  return vsPriorityMap
}

export {
  getGrouperLibraryCanonical,
  getReleaseDescription,
  setReleaseDescription,
  getVSPriority,
  setVSPriority,
  missingFields,
  editComposeInclude,
  getReleaseLabel,
  setReleaseLabel,
  setTitleAndDerivedName,
  setEffectivePeriodStart,
  validStartDate
}
