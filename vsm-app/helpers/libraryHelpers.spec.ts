import { cloneDeep } from 'lodash'
import {
  getReleaseDescription,
  setReleaseDescription,
  getVSPriority,
  missingFields,
  editComposeInclude,
  validStartDate,
  setEffectivePeriodStart
} from './libraryHelpers'

describe('libraryHelpers', () => {
  describe('getReleaseDescription', () => {
    it('should extract valueString text from resource', () => {
      const releaseDescription = getReleaseDescription(FIXTURE_PROGRAM)
      expect(releaseDescription).toBe('testtesttest')
    })

    it('should return empty string when null or undefined passed', () => {
      const releaseDescriptionNull = getReleaseDescription(null)
      const releaseDescriptionUndefined = getReleaseDescription(undefined)
      expect(releaseDescriptionNull).toBe('')
      expect(releaseDescriptionUndefined).toBe('')
    })
  })

  describe('setReleaseDescription', () => {
    let testFixture: fhir4.Library
    beforeEach(() => {
      testFixture = cloneDeep(FIXTURE_PROGRAM)
    })

    it('should set extension when none present', () => {
      delete testFixture.extension
      const newDescription = 'this is the new description'
      const modifiedProgram = setReleaseDescription(testFixture, newDescription)
      const retrievedDescription = getReleaseDescription(modifiedProgram)
      expect(retrievedDescription).toBe(newDescription)
    })

    it('should set new valueString when release description exists', () => {
      const newDescription = 'this is the new description'
      const modifiedProgram = setReleaseDescription(testFixture, newDescription)
      const retrievedDescription = getReleaseDescription(modifiedProgram)
      expect(retrievedDescription).toBe(newDescription)
    })

    it('should set valueString when release description does not exists but extension does', () => {
      testFixture.extension = []
      const newDescription = 'this is the new description'
      const modifiedProgram = setReleaseDescription(testFixture, newDescription)
      const retrievedDescription = getReleaseDescription(modifiedProgram)
      expect(retrievedDescription).toBe(newDescription)
    })
  })

  describe('missingFields', () => {
    it('should return true if fields are present', () => {
      const fieldsToCheck = ['resourceType', 'publisher']
      const result = missingFields({ program: FIXTURE_PROGRAM, requiredFields: fieldsToCheck })
      expect(result).toStrictEqual([])
    })

    it('should return false if fields are missing', () => {
      const fieldsToCheck = ['resourceType', 'nonexistentfield']
      const result = missingFields({ program: FIXTURE_PROGRAM, requiredFields: fieldsToCheck })
      expect(result).toStrictEqual(['nonexistentfield'])
    })
  })

  describe('editComposeInclude', () => {
    it('should delete relatedArtifact if base url matches (ignores version)', () => {
      const simple_lib = {
        resourceType: 'Library',
        relatedArtifact: [
          {
            type: 'composed-of',
            resource: 'www.example.com|1.1',
            extension: [
              {
                url: 'http://hl7.org/fhir/StructureDefinition/crmi-isOwned',
                valueBoolean: true
              }
            ]
          },
          {
            type: 'composed-of',
            resource: 'www.secondExample.com',
            extension: [
              {
                url: 'http://hl7.org/fhir/StructureDefinition/crmi-isOwned',
                valueBoolean: true
              }
            ]
          }
        ]
      } as fhir4.Library

      const simple_lib_result = {
        resourceType: 'Library',
        relatedArtifact: [
          {
            type: 'composed-of',
            resource: 'www.secondExample.com',
            extension: [
              {
                url: 'http://hl7.org/fhir/StructureDefinition/crmi-isOwned',
                valueBoolean: true
              }
            ]
          }
        ]
      } as fhir4.Library

      const fieldToEdit = {
        url: 'www.example.com'
      }

      const editedRctc = editComposeInclude({ grouperLib: simple_lib, relatedArtifact: fieldToEdit, action: 'remove' })

      expect(editedRctc).toEqual(simple_lib_result)
    })

    it('should delete entire relatedArtifact block if empty after delete', () => {
      const simple_lib = {
        resourceType: 'Library',
        relatedArtifact: [
          {
            type: 'composed-of',
            resource: 'www.example.com|1.1',
            extension: [
              {
                url: 'http://hl7.org/fhir/StructureDefinition/crmi-isOwned',
                valueBoolean: true
              }
            ]
          }
        ]
      } as fhir4.Library

      const simple_lib_result = {
        resourceType: 'Library'
      } as fhir4.Library

      const fieldToEdit = {
        url: 'www.example.com'
      }

      const editedRctc = editComposeInclude({ grouperLib: simple_lib, relatedArtifact: fieldToEdit, action: 'remove' })

      expect(editedRctc).toEqual(simple_lib_result)
    })
  })

  describe('getVSPriority', () => {
    it('should return the priority of the value set', () => {
      const map = getVSPriority(FIXTURE_PROGRAM)
      expect(map['http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.481']).toBe('emergent')
    })
  })
})

describe('validStartDate', () => {
  it('should be true for today', () => {
    const todayDate = new Date()
    const todayAsString = `${todayDate.getFullYear()}-${todayDate.getMonth() + 1}-${todayDate.getDate()}`
    expect(validStartDate(todayAsString)).toBe(true)
  })

  it('should be true for future date', () => {
    const todayDate = new Date()
    const nextYearString = `${todayDate.getFullYear() + 1}-${todayDate.getMonth()}-${todayDate.getDate()}`
    expect(validStartDate(nextYearString)).toBe(true)
  })

  it('should be false for past date', () => {
    const todayDate = new Date()
    const lastYearString = `${todayDate.getFullYear() - 1}-${todayDate.getMonth() + 1}-${todayDate.getDate()}`
    expect(validStartDate(lastYearString)).toBe(false)
  })

  it('should be false for invalid date', () => {
    expect(validStartDate(null)).toBe(false)
    expect(validStartDate('abc')).toBe(false)
    expect(validStartDate(NaN)).toBe(false)
  })
})

describe('setEffectivePeriodStart', () => {
  it('should add effective period if it does not exist', () => {
    const testProgram = {} as fhir4.Library
    const programWithEffective = setEffectivePeriodStart(testProgram, '2020-12-12')
    expect(programWithEffective?.effectivePeriod?.start).toEqual('2020-12-12')
  })

  it('should update effective period if it does exist', () => {
    const testProgram = {
      effectivePeriod: {
        start: 'some date'
      }
    } as fhir4.Library
    const programWithEffective = setEffectivePeriodStart(testProgram, '2020-12-12')
    expect(programWithEffective?.effectivePeriod?.start).toEqual('2020-12-12')
  })
})

const FIXTURE_PROGRAM = {
  resourceType: 'Library',
  id: 'SpecificationLibrary',
  meta: {
    versionId: '1',
    lastUpdated: '2022-11-21T17:46:17.533+00:00',
    source: '#iDfokAiN5VipZbmc',
    profile: ['http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-specification-library']
  },
  url: 'http://ersd.aimsplatform.org/fhir/Library/SpecificationLibrary',
  version: '2022-10-19',
  name: 'SpecificationLibrary',
  title: 'Specification Library',
  extension: [
    {
      url: 'http://hl7.org/fhir/StructureDefinition/artifact-releaseDescription',
      valueString: 'testtesttest'
    }
  ],
  status: 'draft',
  experimental: true,
  type: {
    coding: [
      {
        system: 'http://terminology.hl7.org/CodeSystem/library-type',
        code: 'asset-collection'
      }
    ]
  },
  publisher: 'Association of Public Health Laboratories (APHL)',
  description: 'Defines the asset-collection library containing the US Public Health specification assets.',
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
        code: 'specification-type'
      },
      valueCodeableConcept: {
        coding: [
          {
            system: 'http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context',
            code: 'program'
          }
        ]
      }
    }
  ],
  relatedArtifact: [
    {
      extension: [
        {
          url: 'http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-priority',
          valueCodeableConcept: {
            coding: [
              {
                system: 'http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context',
                code: 'emergent'
              }
            ],
            text: 'Emergent'
          }
        }
      ],
      type: 'depends-on',
      resource: 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.481'
    },
    {
      type: 'composed-of',
      resource: 'http://ersd.aimsplatform.org/fhir/PlanDefinition/us-ecr-specification',
      extension: [
        {
          url: 'http://hl7.org/fhir/StructureDefinition/crmi-isOwned',
          valueBoolean: true
        }
      ]
    },
    {
      type: 'composed-of',
      resource: 'http://ersd.aimsplatform.org/fhir/Library/rctc',
      extension: [
        {
          url: 'http://hl7.org/fhir/StructureDefinition/crmi-isOwned',
          valueBoolean: true
        }
      ]
    }
  ]
} as fhir4.Library
