interface Condition {
  label: string,
  value: {
    system: string,
    version: string,
    code: string,
    text?: string
  }
}

interface ConditionItem {
  system: string,
  version: string,
  code: string,
  display: string
}

interface UsageContextItem {
  code: fhir4.Coding,
  valueCodeableConcept: fhir4.CodeableConcept
}

interface ConditionInfo {
  label: string,
  value: {
    code: string,
    system: string,
    text: string
  }
}

interface ConditionToUpdate {
  canonical: string,
  version: string,
  conditionInfo: ConditionInfo[]
}

const buildConditionItem = (condition: Condition) => {
  let conditionItem = {
    code: {
      system: 'http://terminology.hl7.org/CodeSystem/usage-context-type',
      code: 'focus'
    },
    valueCodeableConcept: {
      coding: [{
        system: condition.value.system,
        code: condition.value.code
      }],
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
  let vs = valueSet
  if (vs?.useContext) {
    const nonConditionContexts = vs?.useContext?.filter(ctx => !ctx?.code?.system?.endsWith('/usage-context-type') && !(ctx?.code?.code === 'focus'))
    const newConditionContexts = newConditions?.map(c => buildConditionItem(c))
    if (nonConditionContexts?.length || newConditionContexts?.length) {
      if (overrideExisting) {
        vs.useContext = [
          ...nonConditionContexts,
          ...newConditionContexts
        ]
      } else {
        const existingConditionContexts = vs?.useContext?.filter(ctx => ctx?.code?.system?.endsWith('/usage-context-type') && (ctx?.code?.code === 'focus'))
        const dedupedNewConditionContexts = newConditionContexts?.filter(condition => (
          existingConditionContexts?.find(ec => (ec?.valueCodeableConcept?.system === condition?.valueCodeableConcept?.system) && (ec.valueCodeableConcept?.code === condition.valueCodeableConcept?.code))
        ))
        vs.useContext = [
          ...nonConditionContexts,
          ...dedupedNewConditionContexts
        ]
      }
    }
  } else if (!vs?.useContext && newConditions?.length) {
    vs.useContext = newConditions?.map(c => buildConditionItem(c))
  }
  return vs
}

const formatConditionsComposeInclude = (conditionsList: any) => {
  const list = conditionsList?.map((c: any) => (
    c?.concept?.map((item: any) => ({
      system: c.system,
      version: c.version,
      code: item.code,
      display: item?.designation
        ?.find((d: fhir4.CodeSystemConceptDesignation) => d?.use?.code === 'synonym')
        ?.value || c?.display || ''
    }))
  )).flat()
  // sort by display
  return list?.sort((firstItem: ConditionItem, secondItem: ConditionItem) => (
    firstItem.display.toUpperCase().localeCompare(secondItem.display.toUpperCase()))
  )
}

const buildConditionOptions = (conditions: ConditionItem[], selectedOptions?: ConditionInfo[] | undefined) => {
  const selectedCodes = selectedOptions?.map((s) => s?.value?.code)?.filter(x => x)
  const flattenedConditions = conditions?.flat(2)
  const result = flattenedConditions?.map(c => (
    {
      value: {
        system: c.system,
        version: c.version,
        code: c.code,
        text: c.display
      },
      label: c.display,
      dataId: `${c.system}${c.code}${c.display}`
    }))?.filter(option => !selectedCodes?.includes(option?.value?.code))
  return result
}



export {
  updateConditions,
  formatConditionsComposeInclude,
  buildConditionOptions
}
export type {
  ConditionItem,
  ConditionInfo,
  ConditionToUpdate
}