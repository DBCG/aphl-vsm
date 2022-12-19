import { cloneDeep } from "lodash";
import { updateConditions } from "./conditionHelpers";

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
