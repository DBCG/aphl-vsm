export const provisionalVsBase = {
  resourceType: 'ValueSet',
  experimental: true,
  status: 'draft',
  meta: {
    profile: [
      'http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-triggering-valueset',
      'http://aphl.org/fhir/vsm/StructureDefinition/vsm-conditionvalueset',
      'http://aphl.org/fhir/vsm/StructureDefinition/vsm-hostedvalueset'
    ],
    tag: [
      {
        system: 'http://aphl.org/fhir/vsm/CodeSystem/vsm-workflow-codes',
        code: 'vsm-authored'
      }
    ]
  },
  extension: [
    {
      url: 'http://hl7.org/fhir/StructureDefinition/valueset-author',
      valueContactDetail: {
        name: 'CSTE Author'
      }
    },
    {
      url: 'http://hl7.org/fhir/StructureDefinition/valueset-steward',
      valueContactDetail: {
        name: 'CSTE Steward'
      }
    },
  {
    url: 'vsm-test-extension', // need a real one, defined in IG?
    valueBoolean: true
  }
  ],
  useContext: [
    {
      code: {
        system: 'http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context-type',
        code: 'reporting'
      },
      valueCodeableConcept: {
        coding: [
          {
            system: 'http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context',
            code: 'triggering'
          }
        ]
      }
    }
  ]
} as fhir4.ValueSet