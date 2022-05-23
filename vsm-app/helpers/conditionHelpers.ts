interface Condition {
  label: string,
  value: {
    system: string,
    version: string,
    code: string,
    text?: string
  }
}

interface UsageContextItem {
  code: fhir4.Coding,
  valueCodeableConcept: fhir4.CodeableConcept
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

// there should be no useContext if it is an empty array
const updateConditions = (valueSet: fhir4.ValueSet, conditions: Condition[]) => {
  let vs = valueSet
  if (vs?.useContext) {
    const nonConditionContexts = vs?.useContext?.filter(ctx => !ctx?.code?.system?.endsWith('/usage-context-type') && !(ctx?.code?.code === 'focus'))
    const conditionContexts = conditions?.map(c => buildConditionItem(c))
    if (nonConditionContexts?.length || conditionContexts?.length) {
      vs.useContext = [
        ...nonConditionContexts,
        ...conditionContexts
      ]
    }
  } else if (!vs?.useContext && conditions?.length) {
    vs.useContext = conditions?.map(c => buildConditionItem(c))
  }
  return vs
}

export { updateConditions }