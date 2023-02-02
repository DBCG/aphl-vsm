const grouperValueSetBase = {
  resourceType: "ValueSet",
  id: "dxtc",
  meta: {
    profile: [
      "http://hl7.org/fhir/us/ecr/StructureDefinition/ersd-valueset",
      "http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-triggering-valueset"
    ]
  },
  extension: [
    {
      url: "http://hl7.org/fhir/StructureDefinition/valueset-author",
      valueContactDetail: {
        name: "CSTE Author"
      }
    },
    {
      url: "http://hl7.org/fhir/StructureDefinition/valueset-steward",
      valueContactDetail: {
        name: "CSTE Steward"
      }
    }
  ],
  // url: "http://ersd.aimsplatform.org/fhir/ValueSet/dxtc",
  // identifier: [
  //   {
  //     system: "urn:ietf:rfc:3986",
  //     value: "urn:oid:2.16.840.1.113762.1.4.1146.627"
  //   }
  // ],
  // version: "2022-10-19",
  // name: "Diagnosis_ProblemTriggersforPublicHealthReporting",
  // title: "Diagnosis_Problem Triggers for Public Health Reporting",
  // status: "active",
  experimental: true,
  publisher: "Association of Public Health Laboratories (APHL)",
  // description: "Purpose: Clinical Focus - This set of values contains diagnoses or problems that represent that the patient may have a potentially reportable condition. For example, these may be diagnoses recorded in an EHR problem list and diagnosis codes used for billing for the encounter. Purpose: Data Element Scope - Diagnoses or problems documented in a clinical record. Purpose: Inclusion Criteria - See individual value sets. Purpose: Exclusion Criteria - See individual value sets. Note - Includes codes from selected value sets used in the Reportable Condition Knowledge Management System (RCKMS) reporting logic. RCKMS value sets in VSAC are for informational use only. When implementing trigger codes for electronic case reporting, use the Reportable Condition Trigger Codes (RCTC) file.",
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
    // what does priority mean? what are the options?
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