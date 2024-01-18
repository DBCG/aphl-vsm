import cloneDeep from 'lodash.clonedeep'
import {
  getReleaseDescription,
  setReleaseDescription,
  getVSPriority,
  missingFields,
  editComposeInclude,
  validStartDate,
  setEffectivePeriodStart,
  setVSPriority,
  setVSConditions,
  getVSConditions
} from './libraryHelpers'
import { Condition } from './conditionHelpers'

describe('libraryHelpers', () => {
  describe('getReleaseDescription', () => {
    it('should extract valueString text from resource', () => {
      const releaseDescription = getReleaseDescription(FIXTURE_PROGRAM_1)
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
      testFixture = cloneDeep(FIXTURE_PROGRAM_1)
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
      const result = missingFields({ program: FIXTURE_PROGRAM_1, requiredFields: fieldsToCheck })
      expect(result).toStrictEqual([])
    })

    it('should return false if fields are missing', () => {
      const fieldsToCheck = ['resourceType', 'nonexistentfield']
      const result = missingFields({ program: FIXTURE_PROGRAM_1, requiredFields: fieldsToCheck })
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

  describe('ValueSet Priority', () => {
    let testProgram: fhir4.Library
    beforeEach(() => {
      testProgram = cloneDeep(FIXTURE_PROGRAM_1)
    })

    describe('getVSPriority', () => {
      it('should return the priority of the value set', () => {
        const map = getVSPriority(testProgram)
        expect(map['http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.481']).toBe('emergent')
      })

      it('should allow multiple valuesets with different oids to have the same priority', () => {
        const newValueSetPriority: fhir4.RelatedArtifact = {
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
          resource: 'http://cts.nlm.nih.gov/fhir/ValueSet/33333'
        }
        testProgram.relatedArtifact?.push(newValueSetPriority)
        const map = getVSPriority(testProgram)
        Object.values(map).forEach((curr) => expect(curr).toBe('emergent'))
      })
    })

    describe('setVSPriority', () => {
      it('should set the priority of the VS', () => {
        const newResourceUrl = 'http://cts.nlm.nih.gov/fhir/ValueSet/999'
        const oldMap = getVSPriority(testProgram)
        expect(oldMap[newResourceUrl]).toBeUndefined()

        const updatedProgram = setVSPriority(testProgram, 'routine', newResourceUrl)
        const newMap = getVSPriority(updatedProgram)
        expect(newMap[newResourceUrl]).toBe('routine')
        expect(newMap['http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.481']).toBe('emergent') // the exisiting default value set should still be there
      })

      it('should update the priority of the VS Only', () => {
        const existingVsResourceUrl = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.481'
        const updatedProgram = setVSPriority(testProgram, 'routine', existingVsResourceUrl)
        const newMap = getVSPriority(updatedProgram)
        expect(newMap[existingVsResourceUrl]).toBe('routine')
        expect(Object.keys(newMap).length).toBe(1) // only one value set should be in the map
      })
    })
  })

  describe('validStartDate', () => {
    beforeEach(() => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2021-02-12'))
    })

    it('should be true for today', () => {
      const todayDate = new Date()
      const todayAsString = `${todayDate.getFullYear()}-${todayDate.getMonth() + 1}-${todayDate.getDate()}`
      expect(validStartDate(todayAsString)).toBe(true)
    })

    it('should be true for future date', () => {
      const todayDate = new Date()
      const nextYearString = `${todayDate.getFullYear() + 1}-${todayDate.getMonth() + 1}-${todayDate.getDate()}`
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

  describe('ValueSet Conditions', () => {
    let testProgram: fhir4.Library
    beforeEach(() => {
      testProgram = cloneDeep(FIXTURE_PROGRAM_1)
    })

    describe('setVSConditions', () => {
      it('should add conditions to the leaf value set', () => {
        const targetedVsUrl = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.481'
        const testProgram = cloneDeep(FIXTURE_PROGRAM_1)
        const conditions = [
          {
            value: {
              system: 'http://snomed.info/sct',
              version: 'http://snomed.info/sct/731000124108',
              code: '731000124108'
            },
            label: 'COVID-19'
          }
        ] as Condition[]
        const updatedProgram = setVSConditions(
          testProgram,
          conditions,
          targetedVsUrl
        )
        const addedCondition = updatedProgram.relatedArtifact?.find(
          (i) =>
            i?.resource === targetedVsUrl &&
            i?.extension?.[0]?.url?.endsWith('vsm-valueset-condition') &&
            i?.extension?.[0]?.valueCodeableConcept?.coding?.[0]?.code === '731000124108' &&
            i?.extension?.[0]?.valueCodeableConcept?.coding?.[0]?.system === 'http://snomed.info/sct'
        )
        expect(addedCondition).toBeDefined()
      })

      it('should remove conditions from the leaf value set', () => {
        const targetedVsUrl = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.481'
        const conditions = [
          {
            value: {
              system: 'http://snomed.info/sct',
              version: 'http://snomed.info/sct/731000124108',
              code: '731000124108'
            },
            label: 'COVID-19'
          }
        ] as Condition[]
        const updatedProgram = setVSConditions(
          testProgram,
          conditions,
          targetedVsUrl
        )
        const addedCondition = updatedProgram.relatedArtifact?.find(
          (i) =>
            i?.resource === targetedVsUrl &&
            i?.extension?.[0]?.url?.endsWith('vsm-valueset-condition') &&
            i?.extension?.[0]?.valueCodeableConcept?.coding?.[0]?.code === '731000124108' &&
            i?.extension?.[0]?.valueCodeableConcept?.coding?.[0]?.system === 'http://snomed.info/sct'
        )
        expect(addedCondition).toBeDefined()
        
        const removedProgram = setVSConditions(
          updatedProgram,
          conditions,
          targetedVsUrl,
          'remove'
        )
        const removedCondition = removedProgram.relatedArtifact?.find(
          (i) =>
            i?.resource === targetedVsUrl &&
            i?.extension?.[0]?.url?.endsWith('vsm-valueset-condition') &&
            i?.extension?.[0]?.valueCodeableConcept?.coding?.[0]?.code === '731000124108' &&
            i?.extension?.[0]?.valueCodeableConcept?.coding?.[0]?.system === 'http://snomed.info/sct'
        )
        expect(removedCondition).toBeUndefined()
      })

      it('should add additional conditions to the program and not duplicate', () => {
        const targetedVsUrl = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.481'
        const conditions = [
          {
            label: 'Acanthamoeba',
            groupIds: ['2210', '2211'],
            value: {
              system: 'http://snomed.info/sct',
              code: '49649001',
              version: '',
              text: 'Acanthamoeba'
            }
          },
          {
            label: 'Acute Flaccid Myelitis (AFM)',
            groupIds: ['2210', '2211'],
            value: {
              system: 'http://snomed.info/sct',
              code: '897031002',
              version: '',
              text: 'Acute Flaccid Myelitis (AFM)'
            }
          },
          {
            value: {
              system: 'http://snomed.info/sct',
              version: '2023-03',
              code: '398565003',
              text: 'Botulism'
            },
            label: 'Botulism'
          }
        ] as Condition[]
        const updatedProgram = setVSConditions(
          testProgram,
          conditions,
          targetedVsUrl
        )
        const additionalCondition = [
          {
            value: {
              system: 'http://snomed.info/sct',
              version: 'http://snomed.info/sct/731000124108',
              code: '731000124108'
            },
            label: 'COVID-19'
          }
        ] as Condition[]

        const finalProgram = setVSConditions(updatedProgram, additionalCondition, targetedVsUrl, 'add')
        const addedCondition = finalProgram.relatedArtifact?.find(
          (i) =>
            i?.resource === targetedVsUrl &&
            i?.extension?.[0]?.url?.endsWith('vsm-valueset-condition') &&
            i?.extension?.[0]?.valueCodeableConcept?.coding?.[0]?.code === '731000124108' &&
            i?.extension?.[0]?.valueCodeableConcept?.coding?.[0]?.system === 'http://snomed.info/sct'
        )
        expect(addedCondition).toBeDefined()

      })
    }),
    describe('getVsConditions', () => {
      it('gets all available conditions in a program', () => {
        expect(getVSConditions(FIXTURE_PROGRAM_CONDITIONS_1)).toStrictEqual(FIXTURE_PROGRAM_CONDITIONS_1_RESULT)
      })
      it('Returns an empty object if there are no conditions in a program', () => {
        expect(getVSConditions(FIXTURE_PROGRAM_1)).toStrictEqual({})
      })
    })
  })
})

const FIXTURE_PROGRAM_1 = {
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

const FIXTURE_PROGRAM_CONDITIONS_1 = {
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
    },
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
        },
        {
          url: "http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition",
          valueCodeableConcept: {
            coding: [
              {
                system: "http://snomed.info/sct",
                code: "49649001"
              }
            ],
            text: "Infection caused by Acanthamoeba (disorder)"
          }
        },
        {
          url: "http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition",
          valueCodeableConcept: {
            coding: [
              {
                system: "http://snomed.info/sct",
                code: "767146004"
              }
            ],
            text: "Toxic effect of arsenic and/or arsenic compound"
          }
        }
      ],
      type: "depends-on",
      resource: "http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.6|20210526"
    },
    {
      extension: [
        {
          url: "http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-priority",
          valueCodeableConcept: {
            coding: [
              {
                system: "http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context",
                code: "routine"
              }
            ],
            text: "Routine"
          }
        },
        {
          url: "http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition",
          valueCodeableConcept: {
            coding: [
              {
                system: "http://snomed.info/sct",
                code: "678910"
              }
            ],
            text: "Really unpleasant infection"
          }
        },
        {
          url: "http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition",
          valueCodeableConcept: {
            coding: [
              {
                system: "http://snomed.info/sct",
                code: "123456"
              }
            ],
            text: "Toxic stuff over here"
          }
        }
      ],
      type: "depends-on",
      resource: "http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.123"
    }
  ]
} as fhir4.Library

const FIXTURE_PROGRAM_CONDITIONS_1_RESULT =     {
  'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.6': [
    {
      id: 'http://snomed.info/sct|49649001',
      valueCodeableConcept: {
        coding: [ { system: 'http://snomed.info/sct', code: '49649001' } ],
        text: 'Infection caused by Acanthamoeba (disorder)'
      }
    },
    {
      id: 'http://snomed.info/sct|767146004',
      valueCodeableConcept: {
        coding: [ { system: 'http://snomed.info/sct', code: '767146004' } ],
        text: 'Toxic effect of arsenic and/or arsenic compound'
      }
    }
  ],
  'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.123': [
    {
      id: 'http://snomed.info/sct|678910',
      valueCodeableConcept: {
        coding: [ { system: 'http://snomed.info/sct', code: '678910' } ],
        text: 'Really unpleasant infection'
      }
    },
    {
      id: 'http://snomed.info/sct|123456',
      valueCodeableConcept: {
        coding: [ { system: 'http://snomed.info/sct', code: '123456' } ],
        text: 'Toxic stuff over here'
      }
    }
  ]
}
