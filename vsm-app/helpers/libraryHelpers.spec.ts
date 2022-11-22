import { cloneDeep } from "lodash";
import { getReleaseDescription, setReleaseDescription } from "./libraryHelpers";

describe('libraryHelpers', () => {

  describe('getReleaseDescription', () => {
    it('should extract valueString text from resource', () => {
      const releaseDescription = getReleaseDescription(FIXTURE_PROGRAM)    
      expect(releaseDescription).toBe('testtesttest')
    });   

    it('should return empty string when null or undefined passed', () => {
      const releaseDescriptionNull = getReleaseDescription(null)    
      const releaseDescriptionUndefined = getReleaseDescription(undefined)    
      expect(releaseDescriptionNull).toBe('')
      expect(releaseDescriptionUndefined).toBe('')
    });   
  })

  describe('setReleaseDescription', () => {
    let testFixture: fhir4.Library
    beforeEach(() => {
      testFixture = cloneDeep(FIXTURE_PROGRAM)
    })

    it('should set extension when none present', () => {
      delete testFixture.extension
      const newDescription = "this is the new description"
      const modifiedProgram = setReleaseDescription(testFixture, newDescription)
      const retrievedDescription = getReleaseDescription(modifiedProgram)
      expect(retrievedDescription).toBe(newDescription)
    });

    it('should set new valueString when release description exists', () => {
      const newDescription = "this is the new description"
      const modifiedProgram = setReleaseDescription(testFixture, newDescription)
      const retrievedDescription = getReleaseDescription(modifiedProgram)
      expect(retrievedDescription).toBe(newDescription)
    });

    it('should set valueString when release description does not exists but extension does', () => {
      testFixture.extension = []
      const newDescription = "this is the new description"
      const modifiedProgram = setReleaseDescription(testFixture, newDescription)
      const retrievedDescription = getReleaseDescription(modifiedProgram)
      expect(retrievedDescription).toBe(newDescription)
    });
  })

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
          "valueString": "testtesttest"
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
