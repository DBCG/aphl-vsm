export const provisionalVsBase = {
  resourceType: 'ValueSet',
  experimental: true,
  status: 'draft',
  version: '1.0.0',
  meta: {
    profile: [
      'http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-triggering-valueset',
      'http://aphl.org/fhir/vsm/StructureDefinition/vsm-conditionvalueset'
    ],
    tag: [
      {
        system: 'http://aphl.org/fhir/vsm/CodeSystem/vsm-workflow-codes',
        code: 'vsm-authored'
      },
      {
        system: 'http://aphl.org/fhir/vsm/CodeSystem/vsm-workflow-codes',
        code: 'vsm-provisional'
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
      url: "http://hl7.org/fhir/StructureDefinition/valueset-authoritativeSource",
      valueUri: process.env.NEXT_PUBLIC_FHIR_CDR_URL
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