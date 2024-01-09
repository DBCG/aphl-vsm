import cloneDeep from 'lodash.clonedeep'
import { capitalizeFirstLetter, generateNameFromTitle } from './stringHelpers'
import { requiredFields } from '@/components/ProgramMetadata'
import { Condition } from './conditionHelpers'

interface RelatedArtifactItem {
  url: string
  version?: string
  extension?: fhir4.Extension[]
}

export type USHealthVSPriority = 'emergent' | 'routine'

export interface ValueSetConditionsMap {
  [key: string]: { id: string; valueCodeableConcept: fhir4.CodeableConcept }[]
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
  requiredFields: typeof requiredFields
}

const missingFields = ({ program, requiredFields }: MissingFields): string[] => {
  // this fn returns all required field names that do not have entries
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

const findPriorityIndexInLibArtifacts = (lib: fhir4.Library, urlToFind: string) => {
  const raBlock = lib.relatedArtifact!

  return raBlock.findIndex(raItem => (
    raItem?.type === 'depends-on' &&
    raItem?.resource === urlToFind &&
    raItem?.extension?.[0]?.url?.endsWith('vsm-valueset-priority')
  ))
}

const createNewPriorityItem = (priorityCode: USHealthVSPriority, resourceUrl: string): fhir4.RelatedArtifact => {
  return ({
    extension: [
      {
        url: 'http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-priority',
        valueCodeableConcept: {
          coding: [
            {
              system: 'http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context',
              code: priorityCode
            }
          ],
          text: capitalizeFirstLetter(priorityCode)
        }
      }
    ],
    type: 'depends-on',
    resource: resourceUrl
  })
}

const setVSPriority = (programLib: fhir4.Library, code: USHealthVSPriority, urlsToUpdate: string[]) => {
  const clonedProgramLib = cloneDeep(programLib)

  // if RA block doesn't exist (which is unlikely) just set it
  // since you'll be setting priorities there anyway
  if (!clonedProgramLib.relatedArtifact) {
    clonedProgramLib.relatedArtifact = []
  }
    
  urlsToUpdate.forEach(url => {
    const indexToUpdate = findPriorityIndexInLibArtifacts(programLib, url)
    const newPriority = createNewPriorityItem(code, url)
    if (indexToUpdate > -1) {
      clonedProgramLib.relatedArtifact![indexToUpdate] = newPriority
    } else
    clonedProgramLib.relatedArtifact?.push(newPriority)
  })
  return clonedProgramLib
}

const getVSPriority = (library: fhir4.Library) => {
  const vsPriorityMap: Record<string, USHealthVSPriority> = {}
  library?.relatedArtifact?.forEach((ra) => {
    if (ra.type === 'depends-on' && ra.extension?.[0]?.url?.endsWith('vsm-valueset-priority')) {
      const vsUrl = ra.resource?.split('|')?.[0] as string
      const priority = ra.extension?.[0]?.valueCodeableConcept?.coding?.[0]?.code
      if (!(priority === 'emergent' || priority === 'routine')) {
        throw 'Unknown priority code!'
      }
      if (vsUrl && priority) {
        vsPriorityMap[vsUrl] = priority
      }
    }
  })
  return vsPriorityMap
}

const getVSConditions = (program: fhir4.Library) => {
  const vsConditions = {} as ValueSetConditionsMap
  program.relatedArtifact?.forEach((artifact) => {
    if (artifact?.type === 'depends-on' && artifact?.extension?.[0]?.url.endsWith('vsm-valueset-condition')) {
      const vsUrl = artifact.resource?.split('|')?.[0] as string
      const condCodeableConcept = artifact.extension?.[0]?.valueCodeableConcept
      const conditionIdentifier = `${condCodeableConcept?.coding?.[0]?.system}|${condCodeableConcept?.coding?.[0]?.code}`
      if (!vsConditions[vsUrl]) {
        vsConditions[vsUrl] = [{ id: conditionIdentifier, valueCodeableConcept: condCodeableConcept! }]
      } else {
        vsConditions[vsUrl].push({ id: conditionIdentifier, valueCodeableConcept: condCodeableConcept! })
      }
    }
  })
  return vsConditions
}

const setVSConditions = (
  program: fhir4.Library,
  conditions: Condition[],
  vsUrl: string,
  action: 'add' | 'remove' | 'override' = 'override'
) => {
  const clonedProgram = cloneDeep(program)
  switch (action) {
    case 'add':
      return addVSConditions(clonedProgram, conditions, vsUrl)
    case 'remove':
      return removeVSConditions(clonedProgram, conditions, vsUrl)
    case 'override':
      return overrideVSConditions(clonedProgram, conditions, vsUrl)
  }
}

const addVSConditions = (program: fhir4.Library, conditions: Condition[], vsUrl: string) => {
  // Create two buckets, one with targeted valueset url and one with the rest.
  const targetedVSCondition = [] as fhir4.RelatedArtifact[]
  const otherRelatedArtifacts = [] as fhir4.RelatedArtifact[]
  program?.relatedArtifact?.forEach((i) => {
    if (i?.resource == vsUrl && i?.extension?.[0]?.url?.endsWith('vsm-valueset-condition')) {
      targetedVSCondition.push(i)
    } else {
      otherRelatedArtifacts.push(i)
    }
  })
  // Loop through conditions and check if they already exist in the targetedVSCondition bucket
  // If they do then ignore otherwise add it to the bucket
  conditions.forEach((condition) => {
    const exists = targetedVSCondition.find(
      (i) =>
        i?.extension?.[0]?.valueCodeableConcept?.coding?.[0]?.system === condition.value.system &&
        i?.extension?.[0]?.valueCodeableConcept?.coding?.[0]?.code === condition.value.code
    )
    if (!exists) {
      targetedVSCondition.push({
        extension: [
          {
            url: 'http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition',
            valueCodeableConcept: {
              coding: [
                {
                  system: condition.value.system,
                  code: condition.value.code
                }
              ],
              text: condition.label
            }
          }
        ],
        type: 'depends-on',
        resource: vsUrl
      })
    }
  })
  program.relatedArtifact = [...otherRelatedArtifacts, ...targetedVSCondition]
  return program
}

// Remove any existing conditions for the given valueset and add the new conditions
const overrideVSConditions = (program: fhir4.Library, conditions: Condition[], vsUrl: string) => {
  const newConditions: fhir4.RelatedArtifact[] =
    conditions.map((i) => ({
      extension: [
        {
          url: 'http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition',
          valueCodeableConcept: {
            coding: [
              {
                system: i.value.system,
                code: i.value.code
              }
            ],
            text: i.label
          }
        }
      ],
      type: 'depends-on',
      resource: vsUrl
    })) || []
  const clearedArtifactFilters = program?.relatedArtifact?.filter(
    (i) => i?.resource !== vsUrl || !i?.extension?.[0]?.url?.endsWith('vsm-valueset-condition')
  )

  program.relatedArtifact = [...(clearedArtifactFilters || []), ...newConditions]

  return program
}

const removeVSConditions = (program: fhir4.Library, conditions: Condition[], vsUrl: string) => {
  // Create two buckets, one with targeted valueset url and one with the rest.
  const targetedVSCondition = [] as fhir4.RelatedArtifact[]
  const otherRelatedArtifacts = [] as fhir4.RelatedArtifact[]
  program?.relatedArtifact?.forEach((i) => {
    if (i?.resource == vsUrl && i?.extension?.[0]?.url?.endsWith('vsm-valueset-condition')) {
      targetedVSCondition.push(i)
    } else {
      otherRelatedArtifacts.push(i)
    }
  })
  // Filter out only the conditions we want to keep
  const filteredConditions = targetedVSCondition.filter((i) => {
    const system = i?.extension?.[0]?.valueCodeableConcept?.coding?.[0]?.system
    const code = i?.extension?.[0]?.valueCodeableConcept?.coding?.[0]?.code
    const condition = conditions.find((j) => j.value.system === system && j.value.code === code)
    return !condition
  })
  program.relatedArtifact = [...otherRelatedArtifacts, ...filteredConditions]

  return program
}

export {
  getGrouperLibraryCanonical,
  getReleaseDescription,
  setReleaseDescription,
  getVSPriority,
  setVSPriority,
  getVSConditions,
  setVSConditions,
  missingFields,
  editComposeInclude,
  getReleaseLabel,
  setReleaseLabel,
  setTitleAndDerivedName,
  setEffectivePeriodStart,
  validStartDate
}
