export const provisionalVsBase = {
  resourceType: 'ValueSet',
  experimental: true,
  status: 'active',
  meta: {
    profile: ['http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-triggering-valueset']
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
      url: 'http://hl7.org/fhir/StructureDefinition/valueset-trusted-expansion',
      valueUri: process.env.FHIR_CDR_URL
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
    },
    {
      code: {
        system: 'http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context-type',
        code: 'priority'
      },
      valueCodeableConcept: {
        coding: [
          {
            system: 'http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context',
            code: 'routine'
          }
        ]
      }
    }
  ]
} as fhir4.ValueSet