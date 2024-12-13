import { cloneDeep } from 'lodash'
import {
  addValueSetToGrouper,
  removeValueSetFromGrouper,
  updateLeafVsVersion,
  createGrouperWithMetadata,
  updateGrouperWithMetadata,
  urlWithoutVersion,
  idWithoutVersion,
  addProfileToValueSet,
  updateVsCodeItem,
  organizeValueSetDefinitionData
} from './valueSetHelpers'
import { uniq } from 'lodash'
import { DeleteData, UpdateData } from '@/pages/api/codesystem/provisional';

const VSM_LEAF_PROFILE_URLS = {
  CONDITION: 'http://aphl.org/fhir/vsm/StructureDefinition/vsm-conditionvalueset',
  HOSTED: 'http://aphl.org/fhir/vsm/StructureDefinition/vsm-hostedvalueset'
}

const testUrl = 'www.test.com'
const testUrl2 = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.1082'

const fixtureWithAllComposeIncludesAndExcludesAndFilter = {
  resourceType: "ValueSet",
  id: "example-123",
  version: "6.0.0-ballot2",
  name: "SampleForTesting",
  status: "draft",
  description: "This is an example value set that references all types of inclusion and exclusion data for testing.",
  compose: {
    lockedDate: "2012-06-13",
    inactive: true,
    include: [
      {
        valueSet: ['www.example.com/hello-union|1.0.0'],
      },
      {
        valueSet: [
          'www.example.com/hello-intersection|2.0.0',
          'www.example.com/hello-intersection|2.0.1'
        ],
      },
      {
        system : "http://loinc.org",
        filter : [{
          property : "parent",
          op : "=",
          value : "LP382412-7"
        }]
      }
    ],
    exclude: [
      {
        valueSet: ['www.example.com/hello-exclusion-union|1.0.0'],
      },
      {
        valueSet: [
          'www.example.com/hello-exclusion-intersection|2.0.0',
          'www.example.com/hello-exclusion-intersection|2.0.1'
        ],
      },
      {
        system : "http://loinc.org",
        filter : [{
          property : "parent",
          op : "=",
          value : "abcd-7"
        }]
      }
    ]
  }
} as fhir4.ValueSet

const fixtureWithAllComposeIncludesAndExcludesAndConcept = {
  resourceType: "ValueSet",
  id: "example-123",
  version: "6.0.0-ballot2",
  name: "SampleForTesting",
  status: "draft",
  description: "This is an example value set that references all types of inclusion and exclusion data for testing.",
  compose: {
    lockedDate: "2012-06-13",
    inactive: true,
    include: [
      {
        valueSet: ['www.example.com/hello-union|1.0.0'],
      },
      {
        valueSet: [
          'www.example.com/hello-intersection|2.0.0',
          'www.example.com/hello-intersection|2.0.1'
        ],
      },
      {
        system: "http://loinc.org",
        version: "2.36",
        concept: [
          {
            code: "14647-2",
            display: "Cholesterol [Moles/Volume]"
          },
          {
            code: "2093-3",
            display: "Cholesterol [Mass/Volume]"
          }
        ]
      }
    ],
    exclude: [
      {
        valueSet: ['www.example.com/hello-exclusion-union|1.0.0'],
      },
      {
        valueSet: [
          'www.example.com/hello-exclusion-intersection|2.0.0',
          'www.example.com/hello-exclusion-intersection|2.0.1'
        ],
      },
      {
        system: "http://loinc.org",
        version: "2.36",
        concept: [
          {
            code: "5555",
            display: "Exclude Cholesterol [Moles/Volume]"
          },
          {
            code: "5556",
            display: "Exclude Cholesterol [Mass/Volume]"
          }
        ]
      },
      {
        system: "http://loinc2.org",
        version: "2",
        concept: [
          {
            code: "6666",
            display: "Exclude Cholesterol [Moles/Volume]"
          },
          {
            code: "6667",
            display: "Exclude Cholesterol [Mass/Volume]"
          }
        ]
      },
    ]
  }
} as fhir4.ValueSet

describe('organizeValueSetDefinitionData', () => {
  it('should return a structure with all includes and excludes data when filters present', () => {
    const result = organizeValueSetDefinitionData(fixtureWithAllComposeIncludesAndExcludesAndFilter)
    const expectedResult = {
      include: {
        valuesetUnion: [
          {
            url: "www.example.com/hello-union|1.0.0"
          }
        ],
        valuesetIntersection: [
          {
            urls: [
              "www.example.com/hello-intersection|2.0.0",
              "www.example.com/hello-intersection|2.0.1"
            ]
          }
        ],
        filterItems: [
          {
            system: "http://loinc.org",
            version: undefined,
            filter: [
              {
                property: "parent",
                op: "=",
                value: "LP382412-7"
              }
            ]
          }
        ]
      },
      exclude: {
        valuesetUnion: [
          {
            url: "www.example.com/hello-exclusion-union|1.0.0"
          }
        ],
        valuesetIntersection: [
          {
            urls: [
              "www.example.com/hello-exclusion-intersection|2.0.0",
              "www.example.com/hello-exclusion-intersection|2.0.1"
            ]
          }
        ],
        filterItems: [
          {
            system: "http://loinc.org",
            version: undefined,
            filter: [
              {
                property: "parent",
                op: "=",
                value: "abcd-7"
              }
            ]
          }
        ]
      }
    }
    expect(result).toStrictEqual(expectedResult)
  })

  it('should return a value set with all includes and excludes and concepts present', () => {
    const result = organizeValueSetDefinitionData(fixtureWithAllComposeIncludesAndExcludesAndConcept)
    const expectedResult = {
      include: {
        valuesetUnion: [
          {
            url: "www.example.com/hello-union|1.0.0"
          }
        ],
        valuesetIntersection: [
          {
            urls: [
              "www.example.com/hello-intersection|2.0.0",
              "www.example.com/hello-intersection|2.0.1"
            ]
          }
        ],
        codes: [
          {
            system: "http://loinc.org",
            version: "2.36",
            code: "14647-2",
            display: "Cholesterol [Moles/Volume]"
          },
          {
            system: "http://loinc.org",
            version: "2.36",
            code: "2093-3",
            display: "Cholesterol [Mass/Volume]"
          }
        ]
      },
      exclude: {
        valuesetUnion: [
          {
            url: "www.example.com/hello-exclusion-union|1.0.0"
          }
        ],
        valuesetIntersection: [
          {
            urls: [
              "www.example.com/hello-exclusion-intersection|2.0.0",
              "www.example.com/hello-exclusion-intersection|2.0.1"
            ]
          }
        ],
        codes: [
          {
            system: "http://loinc.org",
            version: "2.36",
            code: "5555",
            display: "Exclude Cholesterol [Moles/Volume]"
          },
          {
            system: "http://loinc.org",
            version: "2.36",
            code: "5556",
            display: "Exclude Cholesterol [Mass/Volume]"
          },
          {
            system: "http://loinc2.org",
            version: "2",
            code: "6666",
            display: "Exclude Cholesterol [Moles/Volume]"
          },
          {
            system: "http://loinc2.org",
            version: "2",
            code: "6667",
            display: "Exclude Cholesterol [Mass/Volume]"
          }
        ]
      }
    }
    expect(result).toStrictEqual(expectedResult)
  })
})

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
      const updatedGrouperVS = removeValueSetFromGrouper(grouperToUpdate, [testUrl2])
      let resultShouldMatch = cloneDeep(FIXTURE_GROUPER_VS)
      if (resultShouldMatch?.compose?.include) {
        resultShouldMatch.compose.include.pop()
        expect(updatedGrouperVS).toStrictEqual(resultShouldMatch)
      } else {
        fail('Test data missing compose.include block')
      }
    });
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

      const expectedUseContext = {
                                     "code": {
                                         "system": "http://aphl.org/fhir/vsm/CodeSystem/usage-context-type",
                                         "code": "grouper-type"
                                     },
                                     "valueCodeableConcept": {
                                         "coding": [
                                             {
                                                 "system": "http://aphl.org/fhir/vsm/CodeSystem/usage-context-type",
                                                 "code": "model-grouper"
                                             }
                                         ],
                                         "text": "Model Grouper"
                                     }
                                 }

      const result = createGrouperWithMetadata(metadataWithAuthor)

      // check that all the flat object properties are there
      expect(result).toMatchObject(noAuthor)
      // check that extension is there
      expect(result?.extension?.[0]).toMatchObject(expectedExtension)
      expect(result?.useContext).toContainEqual(expectedUseContext)
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

  describe('idWithoutVerison', () => {
    const test1 = 'http://xyz.com/slkdjf-1.0.0'
    const test2 = 'http://example.com/123'

    expect(idWithoutVersion(test1)).toBe('slkdjf')
    expect(idWithoutVersion(test2)).toBe('123')
  })

  describe('urlWithoutVersion', () => {
    const test1 = 'http://xyz.com/slkdjf-1.0.0'
    const test2 = 'http://example.com'

    expect(urlWithoutVersion(test1)).toBe('http://xyz.com/slkdjf')
    expect(urlWithoutVersion(test2)).toBe('http://example.com')
  })


  describe('addProfileToValueSet', () => {
    it('should add profiles to ValueSet and return a unique list', () => {
      let grouperToUpdate = cloneDeep(FIXTURE_GROUPER_VS)
      const updatedGrouperVS = addProfileToValueSet(grouperToUpdate)

      // Asserts that updatedGrouperVS.meta is not undefined and prevents 
      // issues with updatedGrouperVS.meta.profile possibly being undefined, 
      // since addProfileToValueSet will create it if it is undefined
      expect(updatedGrouperVS.meta).toBeDefined();

      const profiles = updatedGrouperVS.meta!.profile;

      expect(profiles).toContain(VSM_LEAF_PROFILE_URLS.CONDITION);
      expect(profiles).toContain(VSM_LEAF_PROFILE_URLS.HOSTED);

      const uniqueProfiles = uniq(profiles);
      expect(profiles).toEqual(uniqueProfiles);
    })
  })

  describe('updateVsCodeItem', () => {
    it('should update code items when they exist', () => {
      const testVs = cloneDeep(testVsCodesVs)

      const updates1 = {
        action: 'replace-code',
        codeUpdates: [
          {
            old: {code: 'test-code-2', display: 'test-display-2', definition: 'test-definition-2'},
            new: {code: 'test-code-1', display: 'test-display-1', definition: 'test-definition-1'}
          }
        ],
        inValueSets: ['test-5']
      } as UpdateData

      const result = updateVsCodeItem({
        vs: testVs,
        action: 'replace-code',
        updateData: updates1,
        csUrl: 'test.com'
      })

      const expectedResult1 = {
        id: 'test-5',
        resourceType: 'ValueSet',
        url: 'test-vs-url.com',
        name: 'testname',
        compose: {
          include: [
            {
              system: 'test.com',
              concept: [
                { code: 'test-code', display: 'test-display' },
                { code: 'test-code-1', display: 'test-display-1' }
              ]
            }
          ]
        }
      }
      expect(result).toEqual(expectedResult1)
    })

    it ('should return error object if the code was not found in the valueset', () => {
      const testVs = cloneDeep(testVsCodesVs)
      const updates2 = {
        action: 'replace-code',
        codeUpdates: [
          {
            old: {code: 'test-code-nonexist', display: 'test-display-nonexist', definition: 'test-definition-nonexist'},
            new: {code: 'test-code-1', display: 'test-display-1', definition: 'test-definition-1'}
          }
        ],
        inValueSets: ['test-5']
      } as UpdateData

      const result = updateVsCodeItem({
        vs: testVs,
        action: 'replace-code',
        updateData: updates2,
        csUrl: 'test.com'
      })

      const expectedResult = { error: `Failed to replace code in system with url test.com in Value Set with url test-vs-url.com (testname)`}

      expect(result).toEqual(expectedResult)
    })

    it('should delete one code items when they exist and leave the others', () => {
      const testVs = cloneDeep(testVsCodesVs)

      const updates1 = {
        action: 'delete-code',
        codeUpdates: [
            {code: 'test-code', display: 'test-display', definition: 'test-definition'}
        ],
        inValueSets: ['test-5']
      } as DeleteData

      const result = updateVsCodeItem({
        vs: testVs,
        action: 'delete-code',
        updateData: updates1,
        csUrl: 'test.com'
      })

      const expectedResult1 = {
        id: 'test-5',
        resourceType: 'ValueSet',
        url: 'test-vs-url.com',
        name: 'testname',
        compose: {
          include: [
            {
              system: 'test.com',
              concept: [
                { code: 'test-code-2', display: 'test-display-2' }
              ]
            }
          ]
        }
      }
      expect(result).toEqual(expectedResult1)
    })
  })
  it('should delete all code items when they exist, along with the compose.include item if no more codes', () => {
    const testVs = cloneDeep(testVsCodesVs)

    const updates1 = {
      action: 'delete-code',
      codeUpdates: [
          {code: 'test-code', display: 'test-display', definition: 'test-definition'},
          {code: 'test-code-2', display: 'test-display-2', definition: 'test-definition-2'}
      ],
      inValueSets: ['test-5']
    } as DeleteData

    const result = updateVsCodeItem({
      vs: testVs,
      action: 'delete-code',
      updateData: updates1,
      csUrl: 'test.com'
    })

    const expectedResult1 = {
      id: 'test-5',
      resourceType: 'ValueSet',
      url: 'test-vs-url.com',
      name: 'testname',
      compose: {
        include: []
      }
    }
    expect(result).toEqual(expectedResult1)
  })
  it('should return the valueset unaltered if the code does not match', () => {
    const testVs = cloneDeep(testVsCodesVs)

    const updates1 = {
      action: 'delete-code',
      codeUpdates: [
          { code: 'test-code-nomatch', display: 'test-display', definition: 'test-definition' },
      ],
      inValueSets: ['test-5']
    } as DeleteData

    const result = updateVsCodeItem({
      vs: testVs,
      action: 'delete-code',
      updateData: updates1,
      csUrl: 'test.com'
    })

    expect(result).toEqual(testVsCodesVs)
  })
})

const testVsCodesVs = {
  id: 'test-5',
  resourceType: 'ValueSet',
  url: 'test-vs-url.com',
  name: 'testname',
  compose: {
    include: [
      {
        system: 'test.com',
        concept: [
          { code: 'test-code', display: 'test-display' },
          { code: 'test-code-2', display: 'test-display-2' }
        ]
      }
    ]
  }
} as fhir4.ValueSet

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
