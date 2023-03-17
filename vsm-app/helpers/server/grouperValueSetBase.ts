const grouperValueSetBase = {
  resourceType: "ValueSet",
  meta: {
    profile: [
      "http://hl7.org/fhir/us/ecr/StructureDefinition/ersd-valueset",
      "http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-triggering-valueset"
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
        system: "http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context-type",
        code: "priority"
      },
      valueCodeableConcept: {
        coding: [
          {
            system: "http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context",
            code: "routine"
          }
        ]
      }
    }
  ]
}

export { grouperValueSetBase }