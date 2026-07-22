import { cloneDeep } from 'lodash'
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
  getVSConditions,
  addVSConditions,
  updateGrouperLeafs,
  deleteLeafsFromLibrary,
  USHealthVSPriority
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
                url: 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned',
                valueBoolean: true
              }
            ]
          },
          {
            type: 'composed-of',
            resource: 'www.secondExample.com',
            extension: [
              {
                url: 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned',
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
                url: 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned',
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
                url: 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned',
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
              url: 'http://hl7.org/fhir/uv/crmi/StructureDefinition/crmi-intendedUsageContext',
              valueUsageContext:
              {
                code: {
                  system: 'http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context-type',
                  code: 'priority'
                },
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
            }
          ],
          type: 'depends-on',
          resource: 'http://cts.nlm.nih.gov/fhir/ValueSet/33333'
        }
        testProgram.relatedArtifact?.push(newValueSetPriority)
        const map = getVSPriority(testProgram)
        Object.values(map).forEach((curr) => expect(curr).toBe('emergent'))
      })

      it('should remove pinned version from url when creating map', () => {
        const newValueSetPriority: fhir4.RelatedArtifact = {
          extension: [
            {
              url: 'http://hl7.org/fhir/uv/crmi/StructureDefinition/crmi-intendedUsageContext',
              valueUsageContext:
                  {
                    code: {
                      system: 'http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context-type',
                      code: 'priority'
                    },
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
            }
          ],
          type: 'depends-on',
          resource: 'http://cts.nlm.nih.gov/fhir/ValueSet/33333|1234'
        }
        testProgram.relatedArtifact?.push(newValueSetPriority)
        const map = getVSPriority(testProgram)
        expect(map['http://cts.nlm.nih.gov/fhir/ValueSet/33333']).toBe('emergent')
        expect(map['http://cts.nlm.nih.gov/fhir/ValueSet/33333||1234']).toBeUndefined()
      })

      const buildPriorityRelatedArtifact = (resource: string, code: USHealthVSPriority): fhir4.RelatedArtifact => ({
        type: 'depends-on',
        resource,
        extension: [
          {
            url: 'http://hl7.org/fhir/uv/crmi/StructureDefinition/crmi-intendedUsageContext',
            valueUsageContext: {
              code: {
                system: 'http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context-type',
                code: 'priority'
              },
              valueCodeableConcept: {
                coding: [
                  {
                    system: 'http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context',
                    code
                  }
                ],
                text: code
              }
            }
          }
        ]
      })

      it('should keep a pinned and unpinned entry for the same bare url independent, while still exposing a bare url lookup', () => {
        const bareUrl = 'http://cts.nlm.nih.gov/fhir/ValueSet/33333'
        testProgram.relatedArtifact = [
          buildPriorityRelatedArtifact(`${bareUrl}|1234`, 'emergent'),
          buildPriorityRelatedArtifact(bareUrl, 'routine')
        ]

        const map = getVSPriority(testProgram)

        // each pinned/unpinned entry resolves to its own priority via its exact canonical
        expect(map[`${bareUrl}|1234`]).toBe('emergent')
        expect(map[bareUrl]).toBe('routine')
      })
    })

    describe('setVSPriority', () => {
      it('should set the priority of the VS', () => {
        const urlToCheck = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.481'
        const oldMap = getVSPriority(testProgram)
        expect(oldMap[urlToCheck]).toBe('emergent')

        const updatedProgram = setVSPriority(testProgram, 'routine', [urlToCheck])
        const newMap = getVSPriority(updatedProgram)
        expect(newMap[urlToCheck]).toBe('routine')
      })

      it('should update the priority of the VS Only', () => {
        const existingVsResourceUrl = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.481'
        const updatedProgram = setVSPriority(testProgram, 'routine', [existingVsResourceUrl])
        const newMap = getVSPriority(updatedProgram)
        expect(newMap[existingVsResourceUrl]).toBe('routine')
        expect(Object.keys(newMap).length).toBe(1)
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
          [targetedVsUrl],
          'add'
        )
        const addedCondition = updatedProgram.relatedArtifact?.find(
          (i) =>
            i?.resource === targetedVsUrl && (
             i?.extension?.find(xt => (
               xt?.url?.endsWith('crmi-intendedUsageContext') &&
               xt?.valueUsageContext?.code?.code === 'focus' &&
               xt?.valueUsageContext?.valueCodeableConcept?.coding?.[0]?.code === '731000124108' &&
               xt?.valueUsageContext?.valueCodeableConcept?.coding?.[0]?.system === 'http://snomed.info/sct'
             )) 
            )
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
          [targetedVsUrl],
          'add'
        )
        const conditionAdded = updatedProgram.relatedArtifact?.find(
          (i) =>
            i?.resource === targetedVsUrl && (
              i?.extension?.find(
                xt => (
                  xt?.url?.endsWith('crmi-intendedUsageContext') &&
                  xt?.valueUsageContext?.code?.code === 'focus' &&
                  xt?.valueUsageContext?.valueCodeableConcept?.coding?.[0]?.code === '731000124108' &&
                  xt?.valueUsageContext?.valueCodeableConcept?.coding?.[0]?.system === 'http://snomed.info/sct'
                )
              )
            )
        )
        expect(conditionAdded).toBeDefined()
        
        const removedProgram = setVSConditions(
          updatedProgram,
          conditions,
          [targetedVsUrl],
          'remove'
        )
        const removedCondition = removedProgram.relatedArtifact?.find(
          (i) =>
            i?.resource === targetedVsUrl && (
              i?.extension?.find(
                xt => (
                  xt?.url?.endsWith('crmi-intendedUsageContext') &&
                  xt?.valueUsageContext?.code?.code === 'focus' &&
                  xt?.valueUsageContext?.valueCodeableConcept?.coding?.[0]?.code === '731000124108' &&
                  xt?.valueUsageContext?.valueCodeableConcept?.coding?.[0]?.system === 'http://snomed.info/sct'
                )
              )
            )
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
          [targetedVsUrl],
          'add'
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

        const finalProgram = setVSConditions(updatedProgram, additionalCondition, [targetedVsUrl], 'add')
        const addedCondition = finalProgram.relatedArtifact?.find(
          (i) =>
            i?.resource === targetedVsUrl &&
            i?.extension?.find(ext => (
              ext?.url?.endsWith('crmi-intendedUsageContext') &&
              ext?.valueUsageContext?.code?.code === 'focus' &&
              ext.valueUsageContext?.valueCodeableConcept?.coding?.[0]?.code === '731000124108' &&
              ext.valueUsageContext?.valueCodeableConcept?.coding?.[0]?.system === 'http://snomed.info/sct'
          )))
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

      const buildConditionRelatedArtifact = (resource: string, code: string, text: string): fhir4.RelatedArtifact => ({
        type: 'depends-on',
        resource,
        extension: [
          {
            url: 'http://hl7.org/fhir/uv/crmi/StructureDefinition/crmi-intendedUsageContext',
            valueUsageContext: {
              code: {
                system: 'http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context-type',
                code: 'focus'
              },
              valueCodeableConcept: {
                coding: [{ system: 'http://snomed.info/sct', code }],
                text
              }
            }
          }
        ]
      })

      it('keeps a pinned and unpinned entry for the same bare url independent, and aggregates them under a bare url lookup', () => {
        const bareUrl = 'http://cts.nlm.nih.gov/fhir/ValueSet/99999'
        const program = cloneDeep(FIXTURE_PROGRAM_1)
        program.relatedArtifact = [
          buildConditionRelatedArtifact(`${bareUrl}|1.0`, '111', 'Condition A'),
          buildConditionRelatedArtifact(bareUrl, '222', 'Condition B')
        ]

        const map = getVSConditions(program)

        // the pinned entry's exact canonical only sees its own condition
        expect(map[`${bareUrl}|1.0`]).toStrictEqual([
          { id: 'http://snomed.info/sct|111', valueCodeableConcept: { coding: [{ system: 'http://snomed.info/sct', code: '111' }], text: 'Condition A' } }
        ])
        // the unpinned entry's exact canonical (the bare url itself) sees only its own condition too
        // BUT since it collides with the bare url aggregate key, it ends up merged with the pinned
        // entry's condition there. this is the tradeoff for keeping a bare url lookup
        // available for callers (e.g. code search) that can't distinguish by pinned version
        expect(map[bareUrl]).toStrictEqual([
          { id: 'http://snomed.info/sct|111', valueCodeableConcept: { coding: [{ system: 'http://snomed.info/sct', code: '111' }], text: 'Condition A' } },
          { id: 'http://snomed.info/sct|222', valueCodeableConcept: { coding: [{ system: 'http://snomed.info/sct', code: '222' }], text: 'Condition B' } }
        ])
      })
    })
    describe('addVsConditions', () => {
      const testCondition1 = {
        label: 'Test condition label',
        value: {
          system: 'http://test-system',
          version: '1.0.0',
          code: 'test-code',
          text: 'test text'
        }
      }
      const testCondition2 = {
        label: 'Test condition label 2',
        value: {
          system: 'http://test-system2',
          version: '1.0.0.2',
          code: 'test-code-2',
          text: 'test text 2'
        }
      }

      const testResult1 = [
        {
          url: 'http://hl7.org/fhir/uv/crmi/StructureDefinition/crmi-intendedUsageContext',
          valueUsageContext:
          {
              code:
              {
                  system: 'http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context-type',
                  code: 'priority'
              },
              valueCodeableConcept:
              {
                  coding:
                  [
                      {
                      system: 'http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context',
                      code: 'emergent'
                      }
                  ],
                  text: 'Emergent'
              }
          }
        },
        {
          url: 'http://hl7.org/fhir/uv/crmi/StructureDefinition/crmi-intendedUsageContext',
          valueUsageContext:
              {
                code:
                    {
                      system: 'http://terminology.hl7.org/CodeSystem/usage-context-type',
                      code: 'focus'
                    },
                valueCodeableConcept:
                    {
                      coding:
                          [
                            {
                              system: 'http://test-system',
                              code: 'test-code'
                            }
                          ],
                      text: 'test text'
                    }
              }
        }
      ]

      it('adds a condition to a vs that has no other conditions', () => {
        const conditionExtensions = FIXTURE_PROGRAM_1.relatedArtifact
          ?.find((art: fhir4.RelatedArtifact) => art?.type === 'depends-on' && art?.resource == 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.481')
          ?.extension

        expect(conditionExtensions).toHaveLength(1)
        const updatedProgram = (
          addVSConditions(FIXTURE_PROGRAM_1, [testCondition1], ['http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.481'])
        )
        const updatedVsConditionExtensions = updatedProgram.relatedArtifact
          ?.find((art: fhir4.RelatedArtifact) => art?.type === 'depends-on' && art?.resource == 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.481')
          ?.extension

        expect(updatedVsConditionExtensions).toHaveLength(2)
        expect(updatedVsConditionExtensions).toStrictEqual(testResult1)
      })

      it('adds a condition to a vs that has other conditions', () => {
        // http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.6|20210526
        const conditionExtensions = FIXTURE_PROGRAM_CONDITIONS_1.relatedArtifact
          ?.find((art: fhir4.RelatedArtifact) => art?.type === 'depends-on' && art?.resource == 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.6|20210526')
          ?.extension

        expect(conditionExtensions).toHaveLength(3)

        const updatedProgram = (
          addVSConditions(FIXTURE_PROGRAM_CONDITIONS_1, [testCondition2], ['http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.6|20210526'])
        )

        const updatedVsConditionExtensions = updatedProgram.relatedArtifact
          ?.find((art: fhir4.RelatedArtifact) => art?.type === 'depends-on' && art?.resource == 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.6|20210526')
          ?.extension
        
        expect(updatedVsConditionExtensions).toHaveLength(4)

        const addedExtension = updatedVsConditionExtensions?.find((ext: fhir4.Extension) => ext?.valueUsageContext?.valueCodeableConcept?.text == 'test text 2')

        expect(addedExtension).toStrictEqual({
          url: 'http://hl7.org/fhir/uv/crmi/StructureDefinition/crmi-intendedUsageContext',
          valueUsageContext: {
            code: {
              system: 'http://terminology.hl7.org/CodeSystem/usage-context-type',
              code: 'focus'
            },
            valueCodeableConcept: {
              coding: [
                {
                  code: 'test-code-2',
                  system: 'http://test-system2'
                }
              ],
              text: 'test text 2'
            }
          }
        })
      })
    })
  })
  describe('updateGrouperLeafs', () => {
    const FIXTURE_GROUPER_VS_1 = {
      resourceType: 'ValueSet',
      compose: {
        include: [
          { valueSet: ['some-leaf-url.com'] },
          { valueSet: ['another-leaf-url.com'] },
          { valueSet: ['some-other-leaf-url.com'] }
        ]
      }
    } as fhir4.ValueSet
    it('removes more than 1 url from a grouper', () => {
      const urls = ['some-leaf-url.com', 'another-leaf-url.com']
      const result = updateGrouperLeafs(FIXTURE_GROUPER_VS_1, urls, 'remove')
      const resItem = result?.grouper?.compose?.include
      expect(resItem).toHaveLength(1)
      expect(resItem).toStrictEqual([{ valueSet: ['some-other-leaf-url.com'] }])
    })
    it('adds more than 1 url from a grouper', () => {
      const urls = ['new-url.com', 'new-url-2.com']
      const result = updateGrouperLeafs(FIXTURE_GROUPER_VS_1, urls, 'add')
      const resItem = result?.grouper?.compose?.include
      expect(resItem).toHaveLength(5)
      expect(resItem).toStrictEqual([
        { valueSet: ['some-leaf-url.com'] },
        { valueSet: ['another-leaf-url.com'] },
        { valueSet: ['some-other-leaf-url.com'] },
        { valueSet: ['new-url.com'] },
        { valueSet: ['new-url-2.com'] }
      ])
    })

  })
  describe('deleteLeafsFromLibrary', () => {
    const leafsToDelete = ['http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.6|abc'] 

    it('deletes leafs ignoring version field', () => {
      const leafExistsAtBeginning = FIXTURE_PROGRAM_CONDITIONS_1.relatedArtifact?.find(raItem => raItem.resource == 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.6|20210526')
      expect(leafExistsAtBeginning).toBeTruthy()
      const result = deleteLeafsFromLibrary(FIXTURE_PROGRAM_CONDITIONS_1, leafsToDelete)
      // @ts-ignore
      const leafExistsAtEnd = result.resource.relatedArtifact.find(raItem => raItem.resource == 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.6|20210526')
      expect(leafExistsAtEnd).toBeFalsy()
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
      valueMarkdown: 'testtesttest'
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
          url: 'http://hl7.org/fhir/uv/crmi/StructureDefinition/crmi-intendedUsageContext',
          valueUsageContext: {
            code: {
              system: 'http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context-type',
              code: 'priority'
            },
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
          url: 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned',
          valueBoolean: true
        }
      ]
    },
    {
      type: 'composed-of',
      resource: 'http://ersd.aimsplatform.org/fhir/Library/rctc',
      extension: [
        {
          url: 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned',
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
      valueMarkdown: 'testtesttest'
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
            url: 'http://hl7.org/fhir/uv/crmi/StructureDefinition/crmi-intendedUsageContext',
            valueUsageContext:
            {
                code:
                {
                    system: 'http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context-type',
                    code: 'priority'
                },
                valueCodeableConcept:
                {
                    coding:
                    [
                        {
                        system: 'http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context',
                        code: 'emergent'
                        }
                    ],
                    text: 'Emergent'
                }
            }
        },
        {
          url: "http://hl7.org/fhir/uv/crmi/StructureDefinition/crmi-intendedUsageContext",
          valueUsageContext: {
            code: {
              system: 'http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context-type',
              code: 'focus'
            },
            valueCodeableConcept: {
              coding: [
                {
                  system: 'http://snomed.info/sct',
                  code: '49649001'
                }
              ],
              text: 'Infection caused by Acanthamoeba (disorder)'
            }
          }
        },
        {
          url: "http://hl7.org/fhir/uv/crmi/StructureDefinition/crmi-intendedUsageContext",
          valueUsageContext: {
            code: {
              system: 'http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context-type',
              code: 'focus'
            },
            valueCodeableConcept: {
              coding: [
                {
                  system: 'http://snomed.info/sct',
                  code: '767146004'
                }
              ],
              text: 'Toxic effect of arsenic and/or arsenic compound'
            }
          }
        }
      ],
      type: "depends-on",
      resource: "http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.6|20210526"
    },
    {
      extension: [
        {
            url: 'http://hl7.org/fhir/uv/crmi/StructureDefinition/crmi-intendedUsageContext',
            valueUsageContext:
            {
                code:
                {
                    system: 'http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context-type',
                    code: 'priority'
                },
                valueCodeableConcept:
                {
                    coding:
                    [
                        {
                        system: 'http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context',
                        code: 'routine'
                        }
                    ],
                    text: 'Routine'
                }
            }
        },
        {
          url: "http://hl7.org/fhir/uv/crmi/StructureDefinition/crmi-intendedUsageContext",
          valueUsageContext: {
            code: {
              system: 'http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context-type',
              code: 'focus'
            },
            valueCodeableConcept: {
              coding: [
                {
                  system: 'http://snomed.info/sct',
                  code: '678910'
                }
              ],
              text: 'Really unpleasant infection'
            }
          }
        },
        {
          url: "http://hl7.org/fhir/uv/crmi/StructureDefinition/crmi-intendedUsageContext",
          valueUsageContext: {
            code: {
              system: 'http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context-type',
              code: 'focus'
            },
            valueCodeableConcept: {
              coding: [
                {
                  system: 'http://snomed.info/sct',
                  code: '123456'
                }
              ],
              text: 'Toxic stuff over here'
            }
          }
        }
      ],
      type: "depends-on",
      resource: "http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.123"
    }
  ]
} as fhir4.Library

const FIXTURE_PROGRAM_CONDITIONS_1_RESULT =     {
  // pinned canonical key: what ProgramValueSetDetails uses to distinguish rows that
  // share a bare url but were pinned to different versions
  'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.6|20210526': [
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
  // bare url key: kept for callers (e.g. code search) that can't distinguish by version
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
