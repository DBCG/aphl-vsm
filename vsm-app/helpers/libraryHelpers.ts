import { cloneDeep } from 'lodash'
import { capitalizeFirstLetter, generateNameFromTitle } from './stringHelpers'
import { Condition } from './conditionHelpers'
import { urlWithoutPinnedVersion } from './valueSetHelpers'
import FhirClient from '@/backend/clients/FhirCdrClient'

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

const isReleaseInProgress = (program: fhir4.Library) => {
  return program?.status === 'draft' && getReleaseLabel(program)?.length > 0
}

const getGrouperLibraryCanonical = (program: fhir4.Library) => {
  return program?.relatedArtifact?.find((related) => related.type === 'composed-of' && related?.resource?.includes('/Library/'))
    ?.resource as string
}

const getReleaseDescription = (program: fhir4.Library | null | undefined) => {
  // Run some more checks on the type of library
  return program?.extension?.find((ext) => ext?.url?.endsWith('artifact-releaseDescription'))?.valueMarkdown || ''
}

const setReleaseDescription = (program: fhir4.Library, releaseDescription: string = ''): fhir4.Library => {
  const releaseDescriptionExtensionUrl = 'http://hl7.org/fhir/StructureDefinition/artifact-releaseDescription'
  return setExtension(program, releaseDescriptionExtensionUrl, releaseDescription, 'valueMarkdown')
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
  // @ts-ignore
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

const setExtension = (program: fhir4.Library, url: string, value: string, valueType = 'valueString') => {
  const clonedProgram = cloneDeep(program)

  const newExtensionEntry = {
    url,
    [valueType]: value
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

const removeReleaseLabel = (program: fhir4.Library) => {
  const clonedProgram = cloneDeep(program)
  const releaseLabelExtensionUrl = 'http://hl7.org/fhir/StructureDefinition/artifact-releaseLabel'
  const libraryExtensionIndex = clonedProgram?.extension?.findIndex((ext) => ext?.url === releaseLabelExtensionUrl) || -1

  if (clonedProgram?.extension && libraryExtensionIndex > -1) {
    clonedProgram.extension.splice(libraryExtensionIndex, 1)
  }

  return clonedProgram
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
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone // Get Users timezone
  }).format(Date.now())
  const [monthToday, dayToday, yearToday] = today.split('/')

  const testDate = Number(`${year}${month.padStart(2, '0')}${day.padStart(2, '0')}`)
  const todayDate = Number(`${yearToday}${monthToday}${dayToday}`)

  return testDate - todayDate > -1
}

const createPriorityItem = (code: string) => ({
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
})

const setVSPriority = (target: fhir4.Library, code: USHealthVSPriority, canonicals: string[]) => {
  const clonedTarget = cloneDeep(target)
  // add RA block if doesn't exist
  if (!clonedTarget.relatedArtifact) clonedTarget.relatedArtifact = []
  // update on iterate
  let newCanonicals = canonicals
  // update relatedArtifacts that exist
  let newRA = clonedTarget.relatedArtifact?.map((item) => {
    // find the matching relatedArtifact by canonical
    if (item?.resource && canonicals.includes(item.resource) && item.type === 'depends-on') {
      newCanonicals = newCanonicals.filter((c) => c !== item.resource)
      // set if doesn't exist
      if (!item.extension) item.extension = []
      const matchIndex = item.extension?.findIndex((i) => i.url.endsWith('vsm-valueset-priority'))

      const itemToAdd = createPriorityItem(code)
      if (matchIndex > -1) {
        item.extension[matchIndex] = itemToAdd
      } else {
        item.extension.push(itemToAdd)
      }
    }

    return item
  })

  newCanonicals.forEach((url) => {
    newRA.push({
      type: 'depends-on',
      resource: url,
      extension: [createPriorityItem(code)]
    })
  })

  clonedTarget.relatedArtifact = newRA

  return clonedTarget
}

const getVSPriority = (library: fhir4.Library) => {
  const vsPriorityMap: Record<string, USHealthVSPriority> = {}
  library?.relatedArtifact?.forEach((ra) => {
    const priorityExtensionIndex = ra.extension?.findIndex((ext) => ext?.url?.endsWith('vsm-valueset-priority'))
    // if priority already exists
    if (ra.type === 'depends-on' && typeof priorityExtensionIndex === 'number' && priorityExtensionIndex > -1) {
      const vsUrl = ra.resource?.split('|')?.[0] as string
      const priority = ra.extension?.[priorityExtensionIndex]?.valueCodeableConcept?.coding?.[0]?.code
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

interface ConditionsData {
  system: string
  version: string
  code: string
  display: string
}

const getConditionText = (conditionItem: ConditionsData | undefined, currentConditionExtension: fhir4.Extension) => {
  const noTextResult = 'No display value for this condition'

  return conditionItem?.display || currentConditionExtension?.valueCodeableConcept?.text || noTextResult
}

// get all conditions by url
const getVSConditions = (program: fhir4.Library) => {
  const vsConditions = {} as ValueSetConditionsMap
  program.relatedArtifact?.forEach((artifact) => {
    const conditionExtensions = artifact?.extension?.filter((ext) => ext?.url?.endsWith('vsm-valueset-condition'))
    if (artifact?.type === 'depends-on' && conditionExtensions?.length) {
      const vsUrl = artifact.resource?.split('|')?.[0] as string

      const arrangedConditions = conditionExtensions.map((ext) => {
        const itemCode = ext?.valueCodeableConcept?.coding?.[0]?.code

        return {
          id: `${ext?.valueCodeableConcept?.coding?.[0]?.system}|${itemCode}`!,
          valueCodeableConcept: ext?.valueCodeableConcept || {}
        }
      })
      if (!vsConditions[vsUrl]) {
        vsConditions[vsUrl] = arrangedConditions
      } else {
        vsConditions[vsUrl] = vsConditions[vsUrl].concat(arrangedConditions)
      }
    }
  })

  return vsConditions
}

const setVSConditions = (
  program: fhir4.Library,
  conditions: Condition[],
  vsUrls: string[],
  action: 'add' | 'remove' | 'override' | null
) => {
  if (!action) {
    action = 'override'
  }
  const clonedProgram = cloneDeep(program)
  switch (action) {
    case 'add':
      return addVSConditions(clonedProgram, conditions, vsUrls)
    case 'remove':
      return removeVSConditions(clonedProgram, conditions, vsUrls)
    case 'override':
      return overrideVSConditions(clonedProgram, conditions, vsUrls)
  }
}

const buildConditionExtensionItem = (code: string, system: string, text: string = 'no condition description provided') => {
  return {
    url: 'http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition',
    valueCodeableConcept: {
      coding: [
        {
          system,
          code
        }
      ],
      text
    }
  }
}

const addVSConditions = (program: fhir4.Library, conditionsToAdd: Condition[], vsUrls: string[]) => {
  const clonedProgram = cloneDeep(program)

  // if relatedArtifact items do not already exist, add them
  vsUrls.forEach((url) => {
    const missingItem = !clonedProgram.relatedArtifact?.find((ra) => vsUrls.includes(ra.resource!) && ra.type === 'depends-on')
    if (missingItem) {
      clonedProgram.relatedArtifact?.push({
        type: 'depends-on',
        resource: url
      })
    }
  })
  const updatedRA = clonedProgram.relatedArtifact?.map((item) => {
    // valueset already exists in related artifacts
    if (item?.type === 'depends-on' && item.resource && vsUrls.includes(item.resource)) {
      if (!item.extension) {
        item.extension = conditionsToAdd.map((c) =>
          buildConditionExtensionItem(c.value.code, c.value.system, c.value.text || c.label || 'No condition label found')
        )
      } else {
        conditionsToAdd.forEach((condition) => {
          const matchingCondition = item?.extension?.find((ext) => {
            return (
              ext?.valueCodeableConcept?.coding?.[0]?.system == condition.value.system &&
              ext?.valueCodeableConcept?.coding?.[0]?.code == condition.value.code
            )
          })

          // if condition doesn't already exist, add it
          if (!matchingCondition) {
            const newExtensionItem = buildConditionExtensionItem(
              condition.value.code,
              condition.value.system,
              condition.value.text || condition.label || 'No condition label found'
            )
            item.extension!.push(newExtensionItem)
          }
        })
      }
    }

    return item
  })

  clonedProgram.relatedArtifact = updatedRA
  return clonedProgram
}

// Remove any existing conditions for the given valueset and add the new conditions
const overrideVSConditions = (program: fhir4.Library, conditions: Condition[], vsUrls: string[]) => {
  const clonedProgram = cloneDeep(program)

  const relatedArtWithConditionsRemoved = clonedProgram.relatedArtifact?.map((ra: fhir4.RelatedArtifact) => {
    if (ra.type === 'depends-on' && ra.extension && ra.resource && vsUrls.includes(ra.resource)) {
      ra.extension = ra.extension.filter((xt) => !xt.url.endsWith('vsm-valueset-condition'))
    }
    return ra
  })

  clonedProgram.relatedArtifact = relatedArtWithConditionsRemoved
  const progWithCondAdded = addVSConditions(clonedProgram, conditions, vsUrls)

  return progWithCondAdded
}

const removeVSConditions = (program: fhir4.Library, conditions: Condition[], vsUrls: string[]) => {
  const clonedProgram = cloneDeep(program)

  const relatedArtWithConditionsRemoved = clonedProgram.relatedArtifact?.map((ra: fhir4.RelatedArtifact) => {
    if (ra.type === 'depends-on' && ra.extension && ra.resource && vsUrls.includes(ra.resource)) {
      ra.extension = ra.extension.filter(
        (xt) =>
          xt?.url?.endsWith('vsm-valueset-condition') &&
          !conditions.find(
            (cond) =>
              xt?.valueCodeableConcept?.coding?.[0]?.system == cond.value.system &&
              xt?.valueCodeableConcept?.coding?.[0]?.code == cond.value.code
          )
      )
    }
    return ra
  })

  clonedProgram.relatedArtifact = relatedArtWithConditionsRemoved
  return clonedProgram
}

interface ErrorType {
  canonical: string
  grouper: string
}
const updateGrouperLeafs = (grouperVs: fhir4.ValueSet, canonicalsToUpdate: string[], action: 'add' | 'remove') => {
  const clonedGrouper = cloneDeep(grouperVs)
  let errors = [] as ErrorType[]
  // if compose include doesn't exist for some reason
  // but this really shouldn't happen after a grouper is created
  if (!clonedGrouper?.compose?.include) {
    clonedGrouper.compose = { include: [] }
  }
  canonicalsToUpdate.forEach((canonical) => {
    const matchIndex = clonedGrouper.compose!.include.findIndex((i) => i?.valueSet?.[0] === canonical)

    if (action === 'add' && matchIndex === -1) {
      clonedGrouper.compose!.include.push({ valueSet: [canonical] })
    } else if (action === 'remove' && matchIndex > -1) {
      if (clonedGrouper.compose!.include.length === 1) {
        const grouperError = { canonical, grouper: clonedGrouper?.title || clonedGrouper.name! }
        errors.push(grouperError)
      } else {
        const filtered = clonedGrouper.compose!.include.filter((i) => i.valueSet![0] !== canonical)
        // only delete if not the last one
        clonedGrouper.compose!.include = filtered
      }
    }
  })
  return { grouper: clonedGrouper, errors }
}

const deleteValueSetReferencesFromLibrary = (library: fhir4.Library, canonicalsToRemove: string[]) => {
  // remove valueset from depends-on via canonical
  let clonedLib = cloneDeep(library)

  const updatedRelatedArtifacts = clonedLib.relatedArtifact?.filter((ra) => !canonicalsToRemove.includes(ra.resource!))
  clonedLib.relatedArtifact = updatedRelatedArtifacts
  return clonedLib
}

const deleteLeafsFromLibrary = (programLib: fhir4.Library, valuesetUrlsToDelete: string[]): fhir4.BundleEntry => {
  let programLibToUpdate = cloneDeep(programLib)
  const cleanedUrlsToDelete = valuesetUrlsToDelete.map((url) => urlWithoutPinnedVersion(url).toLowerCase())
  const updatedRA = programLibToUpdate.relatedArtifact?.filter((raItem) => {
    const raItemResourceUrl = raItem.resource?.split('|')?.[0]?.toLowerCase() as string

    if (raItem.type === 'depends-on' && cleanedUrlsToDelete.includes(raItemResourceUrl)) {
      return !cleanedUrlsToDelete.includes(raItemResourceUrl!)
    }
    return true
  })

  programLibToUpdate.relatedArtifact = updatedRA

  return {
    resource: programLibToUpdate,
    request: {
      method: 'PUT',
      url: `Library/${programLib.id}`
    }
  } as fhir4.BundleEntry
}

export {
  getGrouperLibraryCanonical,
  getReleaseDescription,
  setReleaseDescription,
  getVSPriority,
  setVSPriority,
  getConditionText,
  getVSConditions,
  setVSConditions,
  missingFields,
  editComposeInclude,
  isReleaseInProgress,
  getReleaseLabel,
  setReleaseLabel,
  removeReleaseLabel,
  setTitleAndDerivedName,
  setEffectivePeriodStart,
  validStartDate,
  addVSConditions,
  updateGrouperLeafs,
  deleteValueSetReferencesFromLibrary,
  deleteLeafsFromLibrary
}
