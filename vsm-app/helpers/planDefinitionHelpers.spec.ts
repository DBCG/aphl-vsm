import { collectPlanDefinitionValueSetUrls } from './planDefinitionHelpers'

const codeFilterInput = (valueSet: string) =>
    ({ type: 'Condition', codeFilter: [{ path: 'code', valueSet }] })

// Mirrors eRSD: the trigger groupers are reached through a nested action's inputs.
const eRsdShapedPlanDefinition = {
  resourceType: 'PlanDefinition',
  url: 'http://ersd.aimsplatform.org/fhir/PlanDefinition/us-ecr-specification',
  relatedArtifact: [
      { type: 'depends-on', resource: 'http://ersd.aimsplatform.org/fhir/Library/rctc|3.1.2' },
      { type: 'depends-on', resource: 'http://ersd.aimsplatform.org/fhir/ValueSet/user-created-grouper|3.1.2' }
  ],
  action: [
    { id: 'start-workflow', trigger: [{ type: 'named-event', name: 'encounter-start' }] },
    {
      id: 'check-triggers',
      action: [
        {
          id: 'is-encounter-reportable',
          input: [
            codeFilterInput('http://ersd.aimsplatform.org/fhir/ValueSet/dxtc|3.1.2'),
            codeFilterInput('http://ersd.aimsplatform.org/fhir/ValueSet/mrtc|3.1.2')
          ]
        }
      ]
    }
  ]
} as unknown as fhir4.PlanDefinition

describe('collectPlanDefinitionValueSetUrls', () => {
  it('finds ValueSets referenced by nested action inputs, with versions stripped', () => {
    const urls = collectPlanDefinitionValueSetUrls(eRsdShapedPlanDefinition)

    expect(urls.has('http://ersd.aimsplatform.org/fhir/ValueSet/dxtc')).toBe(true)
    expect(urls.has('http://ersd.aimsplatform.org/fhir/ValueSet/mrtc')).toBe(true)
    expect(urls.size).toBe(2)
  })

  // Only Grouper ValueSets used by the PlanDefinition should block the grouper delete.
  it('ignores relatedArtifact, so a grouper owned by the manifest is not treated as referenced', () => {
    const urls = collectPlanDefinitionValueSetUrls(eRsdShapedPlanDefinition)

    expect(urls.has('http://ersd.aimsplatform.org/fhir/Library/rctc')).toBe(false)
    expect(urls.has('http://ersd.aimsplatform.org/fhir/ValueSet/user-created-grouper')).toBe(false)
  })

  // Also possible to have ValueSet filters on action outputs or trigger data, ensure they are picked up.
  it('covers action outputs and trigger data as well as inputs', () => {
    const planDefinition = {
      resourceType: 'PlanDefinition',
      action: [
        {
          output: [codeFilterInput('http://example.org/ValueSet/from-output')],
          trigger: [{ type: 'data-changed', data: [codeFilterInput('http://example.org/ValueSet/from-trigger')] }]
        }
      ]
    } as unknown as fhir4.PlanDefinition

    const urls = collectPlanDefinitionValueSetUrls(planDefinition)

    expect(urls.has('http://example.org/ValueSet/from-output')).toBe(true)
    expect(urls.has('http://example.org/ValueSet/from-trigger')).toBe(true)
  })

  // codeFilter is a choice - it constrains by code or by valueSet. A code-only filter names no
  // ValueSet, so it must contribute nothing rather than leak its path or its codes into the set.
  it('ignores codeFilters that constrain by code rather than by ValueSet', () => {
    const planDefinition = {
      resourceType: 'PlanDefinition',
      action: [
        {
          input: [
            {
              type: 'Condition',
              codeFilter: [
                { path: 'code', code: [{ system: 'http://snomed.info/sct', code: '840539006' }] },
                { path: 'category', valueSet: 'http://example.org/ValueSet/real|1.0.0' }
              ]
            }
          ]
        }
      ]
    } as unknown as fhir4.PlanDefinition

    const urls = collectPlanDefinitionValueSetUrls(planDefinition)

    expect([...urls]).toStrictEqual(['http://example.org/ValueSet/real'])
  })

  it('returns an empty set for a missing PlanDefinition or one with no actions', () => {
    expect(collectPlanDefinitionValueSetUrls(undefined).size).toBe(0)
    expect(collectPlanDefinitionValueSetUrls({ resourceType: 'PlanDefinition' } as fhir4.PlanDefinition).size).toBe(0)
  })
})
