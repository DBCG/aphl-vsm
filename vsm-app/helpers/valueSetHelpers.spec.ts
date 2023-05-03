import { cloneDeep } from "lodash";
import {
  addValueSetToGrouper,
  removeValueSetFromGrouper,
  updateLeafVsVersion,
  createGrouperWithMetadata,
  updateGrouperWithMetadata
} from "./valueSetHelpers";


const testUrl = 'www.test.com'
const testUrl2 = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.1082'

describe('valueSetHelpers', () => {
  let FIXTURE_GROUPER_VS: fhir4.ValueSet
  beforeEach(() => {
    FIXTURE_GROUPER_VS = {
      resourceType: 'ValueSet',
      id: 'mrtc',
      meta: {
        profile: [
          'http://hl7.org/fhir/us/ecr/StructureDefinition/ersd-valueset',
          'http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-triggering-valueset'
        ]
      },
      extension: [
        {
          url: 'http://hl7.org/fhir/StructureDefinition/valueset-author',
          valueContactDetail: {
            name: 'CSTE Author'
          }
        },
        {
          url: 'http://hl7.org/fhir/StructureDefinition/valueset-steward',
          valueContactDetail: {
            name: 'CSTE Steward'
          }
        }
      ],
      url: 'http://ersd.aimsplatform.org/fhir/ValueSet/mrtc',
      identifier: [
        {
          system: 'urn:ietf:rfc:3986',
          value: 'urn:oid:2.16.840.1.113762.1.4.1146.1060'
        }
      ],
      version: '2022-10-19',
      name: 'MedicationsTriggersforPublicHealthReporting',
      title: 'Medications Triggers for Public Health Reporting',
      status: 'active',
      experimental: true,
      publisher: 'Association of Public Health Laboratories (APHL)',
      description:
        'Purpose: Clinical Focus - This set of values contains CVX,RXNORM,SNOMED medication codes that may represent that the patient may have a potentially reportable condition. These pertain to medications administered and medications prescribed, where the medication, coded in CVX,RXNORM,SNOMED, may be indicative of a reportable condition. Purpose: Data Element Scope - Prescription drugs names used in observations documented in a clinical record. Purpose: Inclusion Criteria - See individual value sets. Purpose: Exclusion Criteria - See individual value sets. Note - Includes codes from selected value sets used in the Reportable Condition Knowledge Management System (RCKMS) reporting logic. RCKMS value sets in VSAC are for informational use only. When implementing trigger codes for electronic case reporting, use the Reportable Condition Trigger Codes (RCTC) file.',
      useContext: [
        {
          code: {
            system: 'http://terminology.hl7.org/CodeSystem/usage-context-type',
            code: 'program'
          },
          valueReference: {
            reference: 'PlanDefinition/us-ecr-specification'
          }
        },
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
            code: 'priority'
          },
          valueCodeableConcept: {
            coding: [
              {
                system: 'http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context',
                code: 'routine'
              }
            ]
          }
        }
      ],
      purpose: 'Prescription drugs names used in observations documented in a clinical record.',
      compose: {
        include: [
          {
            valueSet: ['http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.1601']
          },
          {
            valueSet: ['http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.1600']
          },
          {
            valueSet: ['http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.1603']
          },
          {
            valueSet: ['http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.1602']
          },
          {
            valueSet: ['http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.1082']
          }
        ]
      }
    }
  })

  describe('addValueSetToGrouper', () => {
    it('should add valueSet to grouper', () => {
      let grouperToUpdate = cloneDeep(FIXTURE_GROUPER_VS)
      const updatedGrouperVS = addValueSetToGrouper(grouperToUpdate, testUrl)
      let resultShouldMatch = cloneDeep(FIXTURE_GROUPER_VS)
      if (resultShouldMatch?.compose?.include) {
        resultShouldMatch.compose.include.push({ valueSet: [testUrl] })
        expect(updatedGrouperVS).toStrictEqual(resultShouldMatch)
      } else {
        fail('Test data missing compose.include block')
      }
    })
  })

  describe('removeValuesetFromGrouper', () => {
    it('should remove valueSet from grouper', () => {
      let grouperToUpdate = cloneDeep(FIXTURE_GROUPER_VS)
      const updatedGrouperVS = removeValueSetFromGrouper(grouperToUpdate, testUrl2)
      let resultShouldMatch = cloneDeep(FIXTURE_GROUPER_VS)
      if (resultShouldMatch?.compose?.include) {
        resultShouldMatch.compose.include.pop()
        expect(updatedGrouperVS).toStrictEqual(resultShouldMatch)
      } else {
        fail('Test data missing compose.include block')
      }
    });

    it('should remove valueSet from grouper', () => {
      let grouperToUpdate = cloneDeep(FIXTURE_GROUPER_VS)
      const updatedGrouperVS = removeValueSetFromGrouper(grouperToUpdate, testUrl2)
      let resultShouldMatch = cloneDeep(FIXTURE_GROUPER_VS)
      if (resultShouldMatch?.compose?.include) {
        resultShouldMatch.compose.include.pop()
        expect(updatedGrouperVS).toStrictEqual(resultShouldMatch)
      } else {
        fail('Test data missing compose.include block')
      }
    })
  })

  describe('updateLeafVsVersion', () => {
    it('Should update the version at the end of the canonical if specified', () => {
      const newValueSet = updateLeafVsVersion(testValueSet1, 'www.example.com/hello', '3.0.0')
      expect(newValueSet).toMatchObject(testValueSetUpdated1)
    })

    it('Should remove the version if latest version is specified', () => {
      const newValueSet = updateLeafVsVersion(testValueSet1, 'www.example.com/hello', 'latest')
      expect(newValueSet).toMatchObject(testValueSetUpdatedLatest)
    })
  })

  describe('createGrouperWithMetadata', () => {
    it('should add all flat fields', () => {
      const noAuthor = {
        title: 'test title',
        name: 'test_name',
        publisher: 'test publisher',
        description: 'test description',
        purpose: 'test purpose',
        version: 'test version',
      }

      const metadataWithAuthor = Object.assign({}, noAuthor, { author: 'test author' })

      const expectedExtension = {
        url: `${process.env.NEXT_PUBLIC_DEFAULT_PUBLISHING_URL}/StructureDefinition/valueset-author`,
        valueContactDetail: {
          name: 'test author'
        }
      }

      const result = createGrouperWithMetadata(metadataWithAuthor)

      // check that all the flat object properties are there
      expect(result).toMatchObject(noAuthor)
      // check that extension is there
      expect(result?.extension?.[0]).toMatchObject(expectedExtension)

    })
  })

  describe('updateGrouperWithMetadata', () => {
    it('adds all metadata to existing grouper', () => {
      const testMetaData = {
        title: 'test title',
        version: '5.4.3',
        publisher: 'test publisher',
        purpose: 'test purpose',
        description: 'test description'
      }

      const testAuthorMetadata = { author: 'test author' }
      const result = updateGrouperWithMetadata({ vsToUpdate: FIXTURE_GROUPER_VS, metadata: testMetaData })
      expect(result).toMatchObject(testMetaData)

      const resultWithAuthor = updateGrouperWithMetadata({ vsToUpdate: FIXTURE_GROUPER_VS, metadata: testAuthorMetadata })

      const authorExtension = resultWithAuthor?.extension?.filter(ext => ext.url.endsWith('valueset-author'))
      expect(authorExtension?.length).toBe(1)
      expect(authorExtension?.[0]?.valueContactDetail?.name).toBe('test author')
    })
  })
})

const testValueSet1 = {
  id: 'test',
  compose: {
    include: [
      {
        valueSet: ['www.example.com/hello|1.0.0'],
      }, {
        valueSet: ['www.example.com/hello|2.0.0']
      }, {
        valueSet: ['www.cats.com/hello|1.0.0']
      }
    ]
  }
} as fhir4.ValueSet

const testValueSetUpdated1 = {
  id: 'test',
  compose: {
    include: [
      {
        valueSet: ['www.example.com/hello|3.0.0'],
      }, {
        valueSet: ['www.example.com/hello|3.0.0']
      }, {
        valueSet: ['www.cats.com/hello|1.0.0']
      }
    ]
  }
} as fhir4.ValueSet


const testValueSetUpdatedLatest = {
  id: 'test',
  compose: {
    include: [
      {
        valueSet: ['www.example.com/hello'],
      }, {
        valueSet: ['www.example.com/hello']
      }, {
        valueSet: ['www.cats.com/hello|1.0.0']
      }
    ]
  }
} as fhir4.ValueSet
