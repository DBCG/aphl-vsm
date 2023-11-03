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
  console.log('update conditions called')
  let vs = cloneDeep(valueSet)

  if (vs?.useContext) {
    console.log('has usecontext')
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

        console.log('non: ', nonConditionContexts)
        console.log('deduped: ', dedupedNewConditionContexts)
        console.log('existing: ', existingConditionContexts)

        vs.useContext = [...nonConditionContexts, ...existingConditionContexts, ...dedupedNewConditionContexts]
      }
    } else {
      delete vs.useContext
    }
  } else if (!vs?.useContext && newConditions?.length) {
    console.log('no usecontext')
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

export { updateConditions, formatConditionsComposeInclude, buildConditionOptions }
export type { Condition, ConditionItem, ConditionToUpdate }
