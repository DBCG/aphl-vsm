import cloneDeep from 'lodash.clonedeep'
import { MultiValue } from 'react-select'

interface Condition {
  label: string
  value: {
    system: string
    version: string
    code: string
    text?: string
  }
}

type StringObj = Record<string, string[]>

interface ConditionItem {
  system: string
  version: string
  code: string
  display: string
}

interface UsageContextItem {
  code: fhir4.Coding
  valueCodeableConcept: fhir4.CodeableConcept
}

interface ConditionToUpdate {
  canonical: string
  version: string
  conditionInfo: Condition[]
}

const buildConditionItem = (condition: Condition) => {
  let conditionItem = {
    code: {
      system: 'http://terminology.hl7.org/CodeSystem/usage-context-type',
      code: 'focus'
    },
    valueCodeableConcept: {
      coding: [
        {
          system: condition.value.system,
          code: condition.value.code
        }
      ]
    }
  } as UsageContextItem

  // if optional human-readable text field exists, add it
  if (condition.label) conditionItem.valueCodeableConcept.text = condition.label
  return conditionItem
}

// DETAILS PAGE: you want to override existing ones each time
// VALUESETS PAGE: you want to keep any existing conditions that you have added before
// TODO there should be no useContext if it is an empty array
const updateConditions = (valueSet: fhir4.ValueSet, newConditions: Condition[], overrideExisting: boolean = true) => {
  let vs = cloneDeep(valueSet)

  if (vs?.useContext) {
    const nonConditionContexts = vs?.useContext?.filter(
      (ctx) => !ctx?.code?.system?.endsWith('/usage-context-type') && !(ctx?.code?.code === 'focus')
    )
    const newConditionContexts = newConditions?.map((c) => buildConditionItem(c))
    if (nonConditionContexts?.length || newConditionContexts?.length) {
      if (overrideExisting) {
        vs.useContext = [...nonConditionContexts, ...newConditionContexts]
      } else {
        // if a new condition matches one that already exists, filter it out
        const existingConditionContexts = vs?.useContext?.filter(
          (ctx) => ctx?.code?.system?.endsWith('/usage-context-type') && ctx?.code?.code === 'focus'
        )

        const dedupedNewConditionContexts = newConditionContexts?.filter(
          (newCondition) =>
            !existingConditionContexts?.find(
              (ec) =>
                ec?.valueCodeableConcept?.coding?.[0]?.code === newCondition?.valueCodeableConcept?.coding?.[0].code &&
                ec?.valueCodeableConcept?.coding?.[0]?.system === newCondition?.valueCodeableConcept?.coding?.[0].system
            )
        )

        vs.useContext = [...nonConditionContexts, ...existingConditionContexts, ...dedupedNewConditionContexts]
      }
    } else {
      delete vs.useContext
    }
  } else if (!vs?.useContext && newConditions?.length) {
    vs.useContext = newConditions?.map((c) => buildConditionItem(c))
  }
  return vs
}

const formatConditionsComposeInclude = (conditionsList: any) => {
  const list = conditionsList
    ?.map((c: any) =>
      c?.concept?.map((item: any) => ({
        system: c.system,
        version: c.version,
        code: item.code,
        display: item?.designation?.find((d: fhir4.CodeSystemConceptDesignation) => d?.use?.code === 'synonym')?.value || c?.display || ''
      }))
    )
    .flat()
  // sort by display
  return list?.sort((firstItem: ConditionItem, secondItem: ConditionItem) =>
    firstItem.display.toUpperCase().localeCompare(secondItem.display.toUpperCase())
  )
}

const buildConditionOptions = (conditions: ConditionItem[] | [], selectedOptions?: Condition[] | []): MultiValue<Condition> => {
  const selectedCodes = selectedOptions?.map((s) => s?.value?.code)?.filter((x) => !!x)
  const flattenedConditions = conditions?.flat(2)
  const result = flattenedConditions
    ?.map((c) => ({
      value: {
        system: c.system,
        version: c.version,
        code: c.code,
        text: c.display
      },
      label: c.display
    }))
    ?.filter((option) => !selectedCodes?.includes(option?.value?.code))
  return result
}

const condCodesBySystem = (conditionItems: Condition[]) => conditionItems.reduce(
  (accumulator: StringObj, currentValue) => {
    const systemToUpdate = currentValue.value.system
    const currentValues = accumulator[systemToUpdate] || []
    const dedupedValues = [...new Set([currentValue.value.code, ...currentValues])]
    return Object.assign(accumulator, { [systemToUpdate]: dedupedValues })
  },
  {},
);

const removeConditionsFromLeaf = (leafVs: fhir4.ValueSet, conditions: Condition[]): fhir4.ValueSet | null => {
  const clonedLeafVs = cloneDeep(leafVs)
  const ucBlock = clonedLeafVs.useContext

  // if no useContext at all, just return out
  if (!ucBlock) {
    return null
  }

  const conditionsBySystem = condCodesBySystem(conditions)

  const filteredUsageContexts = cloneDeep(ucBlock).filter(existingUcItems => {
    const isUsageCxtType = existingUcItems?.code?.system?.endsWith('/usage-context-type') && existingUcItems?.code?.code === 'focus'
    const systemToCheck = existingUcItems?.valueCodeableConcept?.coding?.[0]?.system
    const codeToCheck = existingUcItems?.valueCodeableConcept?.coding?.[0]?.code
    // if no system or code, just keep this item since don't know if need to delete
    if (systemToCheck === undefined || codeToCheck === undefined) return true
    const codeMatches = conditionsBySystem?.[systemToCheck]?.includes(codeToCheck)
    // we only want to keep useContext items that are either:
    // 1. not the type used for conditions
    // 2. not matching the condition codes we want to delete
    return !isUsageCxtType || !codeMatches
  })

  // if lengths are the same, no changes were made, return out
  if (filteredUsageContexts?.length === ucBlock.length) {
    return null
  }

  // if this operation deletes all useContext items, remove the key completely from the leaf vset
  if (!filteredUsageContexts.length) {
    delete clonedLeafVs.useContext
  } else {
    clonedLeafVs.useContext = filteredUsageContexts
  }
  return clonedLeafVs
}

export { updateConditions, formatConditionsComposeInclude, buildConditionOptions, removeConditionsFromLeaf }
export type { Condition, ConditionItem, ConditionToUpdate }
