import { artifactIsOwned, getOwnedReferences } from './ownedHelpers'

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


describe('owned helpers', () => {
  describe('artifactIsOwned', () => {
    expect(artifactIsOwned(TEST_RELATED_ARTIFACT_OWNED)).toBe(true)
    expect(artifactIsOwned(TEST_RELATED_ARTIFACT_NOT_OWNED)).toBe(false)
  })

  describe('getOwnedReferences', () => {

    it('gets all of the owned references from within a library or plandef', () => {
      expect(getOwnedReferences(TEST_LIB)).toEqual([
        'http://ersd.aimsplatform.org/fhir/PlanDefinition/us-ecr-specification|2.0.0',
        'http://ersd.aimsplatform.org/fhir/Library/rctc|1.0.0'
      ])
    })
  })
})
