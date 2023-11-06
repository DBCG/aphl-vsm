import { updateConditions, removeConditionsFromLeaf } from './conditionHelpers'

describe('conditionHelpers', () => {

  describe('updateConditions', () => {
    it('Adds a new condition without overriding existing', () => {
      const newCondition = [{
        label: 'test1',
        value: {
          system: 'www.example.com',
          version: 'abc',
          code: '123',
          text: 'test1'
        }
      }]
      const result = updateConditions(VALUESET_WITH_CONDITIONS_AND_SOURCE, newCondition, false)
      expect(result.useContext).toStrictEqual(result1)
    })
  })

  describe('removeConditionsFromLeaf', () => {
    it('removes one condition and leaves other that does not match', () => {
      const conditionToRemove = [{
        label: 'test1',
        value: {
          system: 'http://snomed.info/sct',
          // currently ignores version
          version: 'abc',
          code: 'test',
          text: 'test'
        }
      }]

      const result = removeConditionsFromLeaf(VALUESET_WITH_CONDITIONS_AND_SOURCE_2, conditionToRemove)
      expect(result?.useContext).toHaveLength(2)
    })

    it('removes entire useContext if all filtered out', () => {
      const conditionToRemove = [{
        label: 'test1',
        value: {
          system: 'http://snomed.info/sct',
          // currently ignores version
          version: 'abc',
          code: '240523007',
          text: 'test'
        }
      }]

      const result = removeConditionsFromLeaf(VALUESET_WITH_CONDITIONS_AND_SOURCE_2, conditionToRemove)
      expect(result?.useContext).toBeUndefined

    })

    it('returns null if no code matches to remove', () => {
      const conditionToRemove = [{
        label: 'test1',
        value: {
          system: 'http://snomed.info/sct',
          // currently ignores version
          version: 'abc',
          code: 'not-a-code',
          text: 'test'
        }
      }]

      const result = removeConditionsFromLeaf(VALUESET_WITH_CONDITIONS_AND_SOURCE_2, conditionToRemove)
      expect(result?.useContext).toBeUndefined

    })
  })
})

const result1 = [
  {
    code: {
      system: "http://terminology.hl7.org/CodeSystem/usage-context-type",
      code: "focus"
    },
    valueCodeableConcept: {
      coding: [
        {
          system: "http://snomed.info/sct", code: "240523007"
        }
      ],
      text: "Viral hemorrhagic fever (disorder)"
    }
  },
  {
    code: {
      system: "http://terminology.hl7.org/CodeSystem/usage-context-type",
      code: "focus"
    },
    valueCodeableConcept: {
      coding: [
        { system: 'www.example.com', code: '123' }
      ],
      text: 'test1'
    }
  }
]

const VALUESET_WITH_CONDITIONS_AND_SOURCE = {
  id: 'test1',
  resourceType: 'ValueSet',
  status: 'active',
  extension: [
    {
      url: 'https://hl7.org/fhir/extension-valueset-authoritativesource.html',
      valueUri: 'https://cts.nlm.nih.gov/fhir'
    }
  ],
  useContext: [
    {
      code: {
        system: "http://terminology.hl7.org/CodeSystem/usage-context-type",
        code: "focus"
      },
      valueCodeableConcept: {
        coding: [{
          system: "http://snomed.info/sct", code: "240523007"
        }],
        text: "Viral hemorrhagic fever (disorder)"
      }
    }
  ]
} as fhir4.ValueSet

const VALUESET_WITH_CONDITIONS_AND_SOURCE_2 = {
  id: 'test1',
  resourceType: 'ValueSet',
  status: 'active',
  extension: [
    {
      url: 'https://hl7.org/fhir/extension-valueset-authoritativesource.html',
      valueUri: 'https://cts.nlm.nih.gov/fhir'
    }
  ],
  useContext: [
    {
      code: {
        system: "http://terminology.hl7.org/CodeSystem/usage-context-type",
        code: "focus"
      },
      valueCodeableConcept: {
        coding: [{
          system: "http://snomed.info/sct", code: "240523007"
        }],
        text: "Viral hemorrhagic fever (disorder)"
      }
    },
    {
      code: {
        system: "http://terminology.hl7.org/CodeSystem/usage-context-type",
        code: "focus"
      },
      valueCodeableConcept: {
        coding: [{
          system: "http://snomed.info/sct", code: "test"
        }],
        text: "test (disorder)"
      }
    },
    {
      code: {
        system: "http://terminology.hl7.org/CodeSystem/usage-context-type-no-match",
        code: "focus"
      },
      valueCodeableConcept: {
        coding: [{
          system: "http://snomed.info/sct", code: "test2"
        }],
        text: "test2 (disorder)"
      }
    }
  ]
} as fhir4.ValueSet
