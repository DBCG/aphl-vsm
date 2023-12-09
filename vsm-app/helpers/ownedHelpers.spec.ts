import { artifactIsOwned, getOwnedCanonicals, getOwnedReferences } from './ownedHelpers'

const TEST_EMPTY_OBJ = {} as fhir4.RelatedArtifact

const TEST_RELATED_ARTIFACT_OWNED = {
  type: "composed-of",
  resource: "http://ersd.aimsplatform.org/fhir/PlanDefinition/us-ecr-specification|2.0.0",
  extension: [
    {
      url: "http://hl7.org/fhir/StructureDefinition/crmi-isOwned",
      valueBoolean: true
    }
  ]
} as fhir4.RelatedArtifact

const TEST_RELATED_ARTIFACT_NOT_OWNED = {
  type: "composed-of",
  resource: "http://ersd.aimsplatform.org/fhir/PlanDefinition/us-ecr-specification|2.0.0",
  extension: [
    {
      url: "http://hl7.org/fhir/StructureDefinition/crmi-isNotOwned",
      valueBoolean: true
    }
  ]
} as fhir4.RelatedArtifact

const TEST_LIB = {
  resourceType: "Library",
  id: "SpecificationLibrary",
  approvalDate: "2023-08-08",
  effectivePeriod: {
    start: "2023-08-07"
  },
  meta: {
    versionId: "1.0.0",
    profile: [
      "http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-specification-library"
    ]
  },
  url: "http://ersd.aimsplatform.org/fhir/Library/SpecificationLibrary",
  version: "1.0.0",
  name: "SpecificationLibrary",
  title: "Specification Library",
  status: "active",
  experimental: true,
  relatedArtifact: [
    {
      extension: [
        {
          url: "http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-priority",
          valueCodeableConcept: {
            coding: [
              {
                system: "http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context",
                code: "emergent"
              }
            ],
            text: "Emergent"
          }
        }
      ],
      type: "depends-on",
      resource: "http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.481"
    },
    {
      type: "composed-of",
      resource: "http://ersd.aimsplatform.org/fhir/PlanDefinition/us-ecr-specification|2.0.0",
      extension: [
        {
          url: "http://hl7.org/fhir/StructureDefinition/crmi-isOwned",
          valueBoolean: true
        }
      ]
    },
    {
      type: "composed-of",
      resource: "http://ersd.aimsplatform.org/fhir/PlanDefinition/us-ecr-specification|2.0.0",
      extension: [
        {
          url: "http://hl7.org/fhir/StructureDefinition/crmi-notOwned",
          valueBoolean: true
        }
      ]
    },
    {
      type: "composed-of",
      resource: "http://ersd.aimsplatform.org/fhir/Library/rctc|1.0.0",
      extension: [
        {
          url: "http://hl7.org/fhir/StructureDefinition/crmi-isOwned",
          valueBoolean: true
        }
      ]
    }
  ]
} as fhir4.Library

const TEST_LIB_WITHOUT_OWNED = {
  resourceType: "Library",
  id: "SpecificationLibrary",
  approvalDate: "2023-08-08",
  effectivePeriod: {
    start: "2023-08-07"
  },
  meta: {
    versionId: "1.0.0",
    profile: [
      "http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-specification-library"
    ]
  },
  url: "http://ersd.aimsplatform.org/fhir/Library/SpecificationLibrary",
  version: "1.0.0",
  name: "SpecificationLibrary",
  title: "Specification Library",
  status: "active",
  experimental: true,
  relatedArtifact: [
    {
      extension: [
        {
          url: "http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-priority",
          valueCodeableConcept: {
            coding: [
              {
                system: "http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context",
                code: "emergent"
              }
            ],
            text: "Emergent"
          }
        }
      ],
      type: "depends-on",
      resource: "http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.481"
    }
  ]
} as fhir4.Library

const TEST_GROUPER_LIB = {
    resourceType: "Library",
    id: "rctc",
    meta: {
      profile: [
        "http://hl7.org/fhir/us/ecr/StructureDefinition/ersd-valueset-library",
        "http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-triggering-valueset-library"
      ]
    },
    url: "http://ersd.aimsplatform.org/fhir/Library/rctc",
    identifier: [
      {
        system: "urn:ietf:rfc:3986",
        value: "2.16.840.1.114222.4.11.7508"
      }
    ],
    version: "1.0.0",
    name: "Reportable_Condition_Trigger_Codes",
    title: "OID",
    status: "active",
    experimental: false,
    type: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/library-type",
          code: "asset-collection"
        }
      ]
    },
    publisher: "Association of Public Health Laboratories (APHL)",
    effectivePeriod: {
      start: "2022-10-19"
    },
    relatedArtifact: [
      {
        type: "composed-of",
        resource: "http://ersd.aimsplatform.org/fhir/ValueSet/dxtc|1.0.0",
        extension: [
          {
            url: "http://hl7.org/fhir/StructureDefinition/crmi-isOwned",
            valueBoolean: true
          }
        ]
      },
      {
        type: "composed-of",
        resource: "http://ersd.aimsplatform.org/fhir/ValueSet/ostc|1.0.0",
        extension: [
          {
            url: "http://hl7.org/fhir/StructureDefinition/crmi-isOwned",
            valueBoolean: true
          }
        ]
      },
    ]
  }

  const TEST_GROUPER_VS_OSTC = {
    resourceType: "ValueSet",
    id: "ostc",
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
    url: "http://ersd.aimsplatform.org/fhir/ValueSet/ostc",
    identifier: [
      {
        system: "urn:ietf:rfc:3986",
        value: "urn:oid:2.16.840.1.113762.1.4.1146.1059"
      }
    ],
    version: "1.0.0",
    name: "Organism_SubstanceReleaseTriggersforPublicHealthReporting",
    title: "Organism_Substance Release Triggers for Public Health Reporting",
    status: "active",
    experimental: true,
    publisher: "Association of Public Health Laboratories (APHL)",
    description: "Purpose: Clinical Focus - This set of values contains organism and substance names received in a laboratory results report, that may represent that the patient has a potentially reportable condition. These pertain to resulted laboratory reports, where the test method is a non-specific test (e.g., general cultures not specific to a condition) and the result value, coded in SNOMED, includes the organism or substance name. Purpose: Data Element Scope - Nominal laboratory result values documented in a clinical record. Purpose: Inclusion Criteria - See individual value sets. Purpose: Exclusion Criteria - See individual value sets. Note - Includes codes from selected value sets used in the Reportable Condition Knowledge Management System (RCKMS) reporting logic. RCKMS value sets in VSAC are for informational use only. When implementing trigger codes for electronic case reporting, use the Reportable Condition Trigger Codes (RCTC) file.",
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
    ],
    purpose: "Nominal laboratory result values documented in a clinical record."
  }

  const TEST_GROUPER_DXTC = {
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
    url: "http://ersd.aimsplatform.org/fhir/ValueSet/dxtc",
    identifier: [
      {
        system: "urn:ietf:rfc:3986",
        value: "urn:oid:2.16.840.1.113762.1.4.1146.627"
      }
    ],
    version: "1.0.0",
    name: "DiagnosisProblemTriggersforPublicHealthReporting",
    title: "Diagnosis Problem Triggers for Public Health Reporting",
    status: "active",
    experimental: true,
    publisher: "Association of Public Health Laboratories (APHL)"
  }

  const TEST_PLAN_DEF = {
    resourceType: "PlanDefinition",
    id: "us-ecr-specification",
    meta: {
      profile: [
        "http://hl7.org/fhir/us/ecr/StructureDefinition/ersd-plandefinition",
        "http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-plandefinition"
      ]
    },
    text: {
      status: "extensions",
    },
    extension: [
      {
        url: "http://hl7.org/fhir/StructureDefinition/variable",
        valueExpression: {
          name: "normalReportingDuration",
          language: "text/fhirpath",
          expression: "14"
        }
      }
    ],
    url: "http://ersd.aimsplatform.org/fhir/PlanDefinition/us-ecr-specification",
    version: "2.0.0",
    name: "US_eCR_Specification",
    title: "US eCR Specification",
    type: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/plan-definition-type",
          code: "workflow-definition",
          display: "Workflow Definition"
        }
      ]
    },
    status: "active",
    experimental: true,
    date: "2020-07-31T12:32:29.858-05:00",
    publisher: "eCR",
    contact: [
      {
        name: "HL7 International - Public Health",
        telecom: [
          {
            system: "url",
            value: "http://www.hl7.org/Special/committees/pher"
          }
        ]
      }
    ],
    description: "An example ersd PlanDefinition",
    jurisdiction: [
      {
        coding: [
          {
            system: "urn:iso:std:iso:3166",
            code: "US",
            display: "United States of America"
          }
        ],
        text: "United States of America"
      }
    ],
    effectivePeriod: {
      start: "2020-12-01"
    },
    relatedArtifact: [
      {
        type: "depends-on",
        label: "RCTC Value Set Library of Trigger Codes",
        resource: "http://ersd.aimsplatform.org/fhir/Library/rctc|1.0.0"
      }
    ]
  }


describe('owned helpers', () => {
  describe('artifactIsOwned', () => {
    expect(artifactIsOwned(TEST_RELATED_ARTIFACT_OWNED)).toBe(true)
    expect(artifactIsOwned(TEST_RELATED_ARTIFACT_NOT_OWNED)).toBe(false)
    expect(artifactIsOwned(TEST_EMPTY_OBJ)).toBe(false)
  })

  describe('getOwnedReferences', () => {

    it('gets all of the owned references from within a library or plandef', () => {
      expect(getOwnedReferences(TEST_LIB)).toEqual([
        'http://ersd.aimsplatform.org/fhir/PlanDefinition/us-ecr-specification|2.0.0',
        'http://ersd.aimsplatform.org/fhir/Library/rctc|1.0.0'
      ])
    })
    it('should return empty array if no matches', () => {
      expect(getOwnedReferences(TEST_LIB_WITHOUT_OWNED)).toEqual([])
    })
  })
  describe('getOwnedCanonicals', () => {
    const allToCheck = [TEST_GROUPER_DXTC, TEST_GROUPER_LIB, TEST_GROUPER_VS_OSTC, TEST_PLAN_DEF]
    const expectedResult = [
      "http://ersd.aimsplatform.org/fhir/PlanDefinition/us-ecr-specification",
      "http://ersd.aimsplatform.org/fhir/Library/rctc",
      "http://ersd.aimsplatform.org/fhir/ValueSet/dxtc",
      "http://ersd.aimsplatform.org/fhir/ValueSet/ostc"
    ]
    expect(getOwnedCanonicals(TEST_LIB, allToCheck)).toEqual(expectedResult)
  })
})
