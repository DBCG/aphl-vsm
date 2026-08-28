import { splitCanonical } from '@/helpers/stringHelpers'

/**
 * Collects every ValueSet canonical the PlanDefinition itself points at, with any version stripped.
 *
 * This walks the action tree and covers inputs, outputs and trigger data - anywhere a DataRequirement can name a ValueSet.
 */
const collectPlanDefinitionValueSetUrls = (planDefinition: fhir4.PlanDefinition | undefined): Set<string> => {
  const valueSetUrls = new Set<string>()

  // A codeFilter can constrain by code instead of by ValueSet, so only the ValueSet ones count.
  const addValueSetsFrom = (requirements: fhir4.DataRequirement[] = []) => {
    for (const requirement of requirements) {
      for (const codeFilter of requirement.codeFilter ?? []) {
        if (codeFilter.valueSet) {
          valueSetUrls.add(splitCanonical(codeFilter.valueSet)[0])
        }
      }
    }
  }

  // Actions nest, and every level can name ValueSets in three places.
  const visitActions = (actions: fhir4.PlanDefinitionAction[] = []) => {
    for (const action of actions) {
      addValueSetsFrom(action.input)
      addValueSetsFrom(action.output)
      for (const trigger of action.trigger ?? []) {
        addValueSetsFrom(trigger.data)
      }
      visitActions(action.action)
    }
  }

  visitActions(planDefinition?.action)
  return valueSetUrls
}

export { collectPlanDefinitionValueSetUrls }
