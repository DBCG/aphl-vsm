import { removeConditionsFromLeaf, formatConditionsComposeInclude } from './conditionHelpers'

describe('conditionHelpers', () => {
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

  describe('formatConditionsComposeInclude', () => {
    it('prefers synonym as display, then display, then empty string', () => {
      expect(formatConditionsComposeInclude(CONDITIONS_ITEMS)).toEqual(expected_1)
    })
  })
})

const expected_1 = [
  {
    code: "004",
    display: "",
    system: "http://snomed.info/sct",
    version: "2023-01"
  },
  {
    code: "000",
    display: "Acanthamoeba",
    system: "http://snomed.info/sct",
    version: "2023-01"
  },
  {
    code: "001",
    display: "Botulism",
    system: "http://snomed.info/sct",
    version: "2023-01"
  },
  {
    code: "003",
    display: "COVID display term",
    system: "http://snomed.info/sct",
    version: "2023-01"
  }
]

const CONDITIONS_ITEMS = [
  {
    concept: [
      {
        display: 'Botulism with a really really long display that you do not want to read',
        code: '001',
        designation: [
          {
            use: {
              code: 'synonym',
              display: 'Synonym',
              system: 'http://snomed.info/sct'
            },
            value: 'Botulism'
          }
        ]
      },
      {
        display: 'Acanthamoeba with a really really long display that you do not want to read',
        code: '000',
        designation: [
          {
            use: {
              code: 'synonym',
              display: 'Synonym',
              system: 'http://snomed.info/sct'
            },
            value: 'Acanthamoeba'
          }
        ]
      },
      {
        display: 'COVID display term',
        code: '003',
      },
      {
        code: '004',
      }
    ],
    system: 'http://snomed.info/sct',
    version: '2023-01'
  }
] as fhir4.ValueSetComposeInclude[]

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
