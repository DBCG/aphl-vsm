const grouperValueSetBase: fhir4.ValueSet = {
  resourceType: "ValueSet",
  meta: {
    profile: [
      "http://hl7.org/fhir/us/ecr/StructureDefinition/ersd-valueset",
      "http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-triggering-valueset",
      "http://aphl.org/fhir/vsm/StructureDefinition/vsm-groupervalueset"
    ],
    tag: [
      {
        system: 'http://aphl.org/fhir/vsm/CodeSystem/vsm-workflow-codes',
        code: 'vsm-authored'
      }
    ]
  },
  status: "draft",
  experimental: true,
  useContext: [
    {
      code: {
        system: "http://terminology.hl7.org/CodeSystem/usage-context-type",
        code: "program"
      },
      valueReference: {
        reference: "PlanDefinition/us-ecr-specification"
      }
    },
    {
      code: {
        system: "http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context-type",
        code: "reporting"
      },
      valueCodeableConcept: {
        coding: [
          {
            system: "http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context",
            code: "triggering"
          }
        ]
      }
    },
    {
      code: {
        system: "http://aphl.org/fhir/vsm/CodeSystem/usage-context-type",
        code: "grouper-type"
      },
      valueCodeableConcept: {
        coding: [
          {
            system: "http://aphl.org/fhir/vsm/CodeSystem/usage-context-type",
            code: "model-grouper"
          }
        ],
        text: "Model Grouper"
      }
    }
  ]
}

export { grouperValueSetBase }
