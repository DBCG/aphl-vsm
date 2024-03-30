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
  conditionInfo?: Condition[]
}

const buildConditionItem = (condition: Condition) => {
  const conditionItem = {
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

const formatConditionsComposeInclude = (conditionsList: fhir4.ValueSetComposeInclude[]): ConditionItem[] => {
  const list = conditionsList
    ?.flatMap((c) =>
      // ignore missing concept
      (c.concept || []).map((item) => {
        return {
          system: c.system || '',
          version: c.version || '',
          code: item.code || '',
          display: item?.designation?.find((d) => d?.use?.code === 'synonym')?.value || item.display || ''
        }
      })
    )
  // sort by display
  return list?.sort((firstItem, secondItem) =>
    firstItem.display.toUpperCase()?.localeCompare(secondItem?.display.toUpperCase())
  )
}

const removeConditionsWithoutDisplay = (flatConditions: ConditionItem[]) => flatConditions.filter(i => i.display.trim() !== '')

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
)

export {
  formatConditionsComposeInclude,
  buildConditionOptions,
  removeConditionsWithoutDisplay
}
export type { Condition, ConditionItem, ConditionToUpdate }
