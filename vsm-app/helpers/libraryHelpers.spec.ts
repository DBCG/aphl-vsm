

describe('libraryHelpers', () => {
  it('getReleaseDescription from program', () => {
    
  });   

})

const FIXTURE_PROGRAM = {
  "resourceType": "Library",
  "id": "SpecificationLibrary",
  "meta": {
      "versionId": "1",
      "lastUpdated": "2022-11-21T17:46:17.533+00:00",
      "source": "#iDfokAiN5VipZbmc",
      "profile": [
          "http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-specification-library"
      ]
  },
  "url": "http://ersd.aimsplatform.org/fhir/Library/SpecificationLibrary",
  "version": "2022-10-19",
  "name": "SpecificationLibrary",
  "title": "Specification Library",
  "extension":
  [
      {
          "url": "http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-specification-release-description-extension",
          "valueString": "this is the release note to be described\nand this is the format it shall be"
      }
  ],
  "status": "draft",
  "experimental": true,
  "type": {
      "coding": [
          {
              "system": "http://terminology.hl7.org/CodeSystem/library-type",
              "code": "asset-collection"
          }
      ]
  },
  "publisher": "Association of Public Health Laboratories (APHL)",
  "description": "Defines the asset-collection library containing the US Public Health specification assets.",
  "useContext": [
      {
          "code": {
              "system": "http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context-type",
              "code": "reporting"
          },
          "valueCodeableConcept": {
              "coding": [
                  {
                      "system": "http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context",
                      "code": "triggering"
                  }
              ]
          }
      },
      {
          "code": {
              "system": "http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context-type",
              "code": "specification-type"
          },
          "valueCodeableConcept": {
              "coding": [
                  {
                      "system": "http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context",
                      "code": "program"
                  }
              ]
          }
      }
  ],
  "relatedArtifact": [
      {
          "type": "composed-of",
          "resource": "http://ersd.aimsplatform.org/fhir/PlanDefinition/us-ecr-specification"
      },
      {
          "type": "composed-of",
          "resource": "http://ersd.aimsplatform.org/fhir/Library/rctc"
      }
  ]
} as fhir4.Library
