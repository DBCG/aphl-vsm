interface Condition {
  system: string,
  code: string,
  text?: string
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
        system: condition.system,
        code: condition.code
      }],
    }
  } as UsageContextItem

  // if human-readable text field exists, add it
  if (condition.text) conditionItem.valueCodeableConcept.text = condition.text
  return conditionItem
}

const addCondition = (grouperVS: fhir4.ValueSet, condition: Condition) => {
  let grouper = grouperVS
  if (grouper.useContext) {
    grouper.useContext.push(buildConditionItem(condition))
  } else {
    grouper.useContext = [buildConditionItem(condition)]
  }
  return grouper
}

const removeCondition = (grouperVS: fhir4.ValueSet, condition: Condition) => {
  let grouper = grouperVS

  if (grouper.useContext && grouperVS.useContext) {
    grouper.useContext = grouperVS.useContext.filter(ctx => (
      ctx?.code?.system?.endsWith('usage-context-type') &&
      ctx?.code?.code == 'focus' &&
      !ctx?.valueCodeableConcept?.coding?.some(
        c => c?.system == condition.system && c?.code == condition.code
      )
    ))
  } else {
    console.error(`Condition ${condition?.code} of system ${condition.system} not found.`)
  }
  return grouper
}

const conditionHandler = (
  grouperVS: fhir4.ValueSet,
  operation: 'add' | 'remove',
  condition: Condition
) => {
  if (operation == 'add') {
    return addCondition(grouperVS, condition)
  } if (operation == 'remove') {
    return removeCondition(grouperVS, condition)
  } else {
    console.error(`Operation ${operation} not found.`)
    return grouperVS
  }
}

export { conditionHandler }