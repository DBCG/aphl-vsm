import {
  addOrRemoveVsCodes,
  updateVsMetadata,
  generateProvisionalVs,
  CodesBySystem,
  updateCsCodes,
  createProvisionalCodeSystem
} from './provisionalVsHelpers'

const TEST_VS_NO_CODES = {
  resourceType: 'ValueSet'
} as fhir4.ValueSet

const TEST_VS_WITH_EXTENSIONS = {
  resourceType: 'ValueSet',
  name: 'Old_title',
  title: 'old title',
  extension: [
    {
      url: 'http://hl7.org/fhir/StructureDefinition/valueset-steward',
      valueContactDetail: {
        name: 'old steward'
      }
    },
    {
      url: 'http://hl7.org/fhir/StructureDefinition/valueset-author',
      valueContactDetail: {
        name: 'old author'
      }
    }
  ]
} as fhir4.ValueSet

const TEST_VS_EXISTING_CODES = {
  resourceType: 'ValueSet',
  compose: {
    include: [
      {
        system: 'www.system.com',
        version: 'PROVISIONAL',
        concept: [
          { code: 'abc', display: 'display-to-override' },
          { code: 'def', display: 'display-to-keep' }
        ]
      },
      {
        system: 'www.another-system.com',
        version: 'PROVISIONAL',
        concept: [
          { code: '123', display: 'keep123' },
          { code: '456', display: 'keep456' }
        ]
      }
    ]
  }
} as fhir4.ValueSet

const TEST_CODES_TO_ADD = {
  'www.system.com': [
    { code: 'abc', display: 'overridden!' },
    { code: 'new-code', display: 'a brand new code' }
  ]
}

const TEST_CODES_FOR_REMOVE = {
  'www.system.com': [
    { code: 'abc', display: 'display does not matter' },
    { code: 'new-code', display: 'a brand new code' }
  ]
}

describe('addOrRemoveVsCodes', () => {
  it('adds codes correctly if there is no compose.include block present', () => {
    const result = addOrRemoveVsCodes(TEST_VS_NO_CODES, TEST_CODES_TO_ADD, 'add')
    expect(result?.compose?.include).toStrictEqual([{
      system: 'www.system.com',
      version: 'PROVISIONAL',
      concept: [
        { code: 'abc', display: 'overridden!' },
        { code: 'new-code', display: 'a brand new code' }
      ]
    }
    ])
  })

  it('adds codes correctly if there is an existing compose.include block present', () => {
    const result = addOrRemoveVsCodes(TEST_VS_EXISTING_CODES, TEST_CODES_TO_ADD, 'add')
    expect(result?.compose?.include).toStrictEqual([{
      system: 'www.system.com',
      version: 'PROVISIONAL',
      concept: [
        // this shows 'abc' getting overridden via new data
        { code: 'abc', display: 'overridden!' },
        { code: 'new-code', display: 'a brand new code' },
        { code: 'def', display: 'display-to-keep' },
      ]
    },
    {
      system: 'www.another-system.com',
      version: 'PROVISIONAL',
      concept: [
        { code: '123', display: 'keep123' },
        { code: '456', display: 'keep456' }
      ]
    }
    ])
  })

  it('adds codes correctly if the system does not exist yet', () => {
    const NEW_SYSTEM_ADDITIONS = {
      'new-system': [{ code: 'new', display: 'new system!' }]
    } 
  
    const result = addOrRemoveVsCodes(TEST_VS_EXISTING_CODES, NEW_SYSTEM_ADDITIONS, 'add')
    expect(result?.compose?.include).toStrictEqual([
      {
        system: 'www.system.com',
        version: 'PROVISIONAL',
        concept: [
          { code: 'abc', display: 'display-to-override' },
          { code: 'def', display: 'display-to-keep' }
        ]
      },
      {
        system: 'www.another-system.com',
        version: 'PROVISIONAL',
        concept: [
          { code: '123', display: 'keep123' },
          { code: '456', display: 'keep456' }
        ]
      }, {
        system: 'new-system',
        version: 'PROVISIONAL',
        concept: [{ code: 'new', display: 'new system!' }]
      }
    ])
  })

  it('removes codes correctly', () => {
  
    const result = addOrRemoveVsCodes(TEST_VS_EXISTING_CODES, TEST_CODES_FOR_REMOVE, 'remove')
    expect(result?.compose?.include).toStrictEqual([
      {
        system: 'www.system.com',
        version: 'PROVISIONAL',
        concept: [
          { code: 'def', display: 'display-to-keep' }
        ]
      },
      {
        system: 'www.another-system.com',
        version: 'PROVISIONAL',
        concept: [
          { code: '123', display: 'keep123' },
          { code: '456', display: 'keep456' }
        ]
      }
    ])
  })
})

describe('updateVsMetadata', () => {
  it('adds metadata fields when they do not already exist', () => {
    const titleToUpdate = 'updated title'
    const authorToUpdate = 'updated author'
    const stewardToUpdate = 'updated steward'
    const result = updateVsMetadata({
      vsToUpdate: TEST_VS_NO_CODES,
      titleToUpdate,
      authorToUpdate,
      stewardToUpdate
    })

    // correct number of extensions
    expect(result?.extension).toHaveLength(3)
    // author extension is set
    expect(
      result?.extension?.find(x => x?.url?.endsWith('valueset-author'))
    ).toStrictEqual({
      url: 'http://hl7.org/fhir/StructureDefinition/valueset-author',
      valueContactDetail: {
        name: 'updated author'
      }
    })
    // steward extension is set
    expect(
      result?.extension?.find(x => x?.url?.endsWith('valueset-steward'))
    ).toStrictEqual({
      url: 'http://hl7.org/fhir/StructureDefinition/valueset-steward',
      valueContactDetail: {
        name: 'updated steward'
      }
    })

    // title set
    expect(result?.title).toBe('updated title')
    
    // name created
    expect(result?.name).toBe('UpdatedTitle')

    // url created
    expect(result?.url).toContain('/fhir/ValueSet/UpdatedTitle')
  })

  it('overrides fields when they are already existing', () => {
    const titleToUpdate = 'updated title'
    const authorToUpdate = 'updated author'
    const stewardToUpdate = 'updated steward'
    const result = updateVsMetadata({
      vsToUpdate: TEST_VS_WITH_EXTENSIONS,
      titleToUpdate,
      authorToUpdate,
      stewardToUpdate
    })

    expect(
      result?.extension?.find(x => x?.url?.endsWith('valueset-author'))
    ).toStrictEqual({
      url: 'http://hl7.org/fhir/StructureDefinition/valueset-author',
      valueContactDetail: {
        name: 'updated author'
      }
    })
    // steward extension is set
    expect(
      result?.extension?.find(x => x?.url?.endsWith('valueset-steward'))
    ).toStrictEqual({
      url: 'http://hl7.org/fhir/StructureDefinition/valueset-steward',
      valueContactDetail: {
        name: 'updated steward'
      }
    })

    // NOTE: name and trusted expansion should NOT be changed after they're set
    // changing title at that point only changes the title field
    expect(result?.title).toBe('updated title')
    expect(result?.name).toBe('Old_title')
  })
})

describe('generateProvisionalVs', () => {
  it('generates the expected base resource', () => {
    const titleToUpdate = 'updated title'
    const authorToUpdate = 'updated author'
    const stewardToUpdate = 'updated steward'

    const codesBySystem = {
      'http://test-system-1': [
        {
          code: 'test-code-1',
          display: 'test code 1',
          definition: 'test'
        },
        {
          code: 'test-code-2',
          display: 'test code 2',
          definition: 'test 2'
        }
      ],
      'http://test-system-2': [
        {
          code: 'test-code-3',
          display: 'test code 3',
          definition: 'test 3'
        },
        {
          code: 'test-code-4',
          display: 'test code 4',
          definition: 'test 4'
        }
      ]
    } as CodesBySystem

    const result = generateProvisionalVs({
      codesBySystemToAdd: codesBySystem,
      titleToUpdate,
      authorToUpdate,
      stewardToUpdate
    })

    expect(result?.extension).toHaveLength(4)
    // existing base provisional resource info should exist
    expect(result?.resourceType).toBe('ValueSet')
    expect(result?.status).toBe('draft')

    // correct number of codesystems and codes
    expect(result?.compose?.include).toHaveLength(2)
    expect(result?.compose?.include?.find(i => i?.system === 'http://test-system-1')?.concept).toHaveLength(2)
    expect(result?.compose?.include?.find(i => i?.system === 'http://test-system-2')?.concept).toHaveLength(2)
    // have already tested the ability of the internal fns to produce the right data
  })

  describe('updateCsCodes', () => {
    const testCodeSystem1 = {
      resourceType: 'CodeSystem'
    } as fhir4.CodeSystem

    const testCodeSystem2 = {
      resourceType: 'CodeSystem',
      concept: [
        {
          code: 'code1',
          display: 'code 1',
          definition: 'definition for code 1'
        },
        {
          code: 'code2',
          display: 'code 2',
          definition: 'definition for code 2'
        }
      ]
    } as fhir4.CodeSystem

    const testItems = [
      {
        code: 'code1',
        display: 'code 1',
        definition: 'new definition for code 1'
      },
      {
        code: 'code2',
        display: 'code 2',
        definition: 'new definition for code 2'
      },
      {
        code: 'code3',
        display: 'code 3',
        definition: 'definition for code 3'
      }
    ]
    
    const testItems2 = [
      {
        code: 'code1',
        display: 'code 1',
        definition: 'new definition for code 1'
      }
    ]

    it('adds code items', () => {
      const result1 = updateCsCodes({
        codeSystem: testCodeSystem1,
        codeItems: testItems,
        action: 'add'
      })
      // handles adding codes even if there were none to begin with
      expect(testCodeSystem1.concept).toBeFalsy()
      expect(result1.concept).toHaveLength(3)

      // handles adding codes when some exist already
      const result2 = updateCsCodes({
        codeSystem: testCodeSystem2,
        codeItems: testItems,
        action: 'add'
      })

      // handles adding codes even if there were none to begin with
      expect(testCodeSystem2.concept).toHaveLength(2)
      expect(result2.concept).toHaveLength(3)
      // check that it updated the code's details
      const codeItem = result2.concept?.find(c => c.code === 'code1')
      expect(codeItem?.definition).toBe('new definition for code 1')

      const codeItem2 = result2.concept?.find(c => c.code === 'code2')
      expect(codeItem2?.definition).toBe('new definition for code 2')
      // expect(codeItem)
      const codeItem3 = result2.concept?.find(c => c.code === 'code3')
      expect(codeItem3?.definition).toBe('definition for code 3')
    })

    it('removes code items', () => {
      const result1 = updateCsCodes({
        codeSystem: testCodeSystem2,
        codeItems: testItems,
        action: 'remove'
      })

      // doesn't error out when ask to delete codes that aren't there
      expect(result1.concept).toBeUndefined()


      const result2 = updateCsCodes({
        codeSystem: testCodeSystem1,
        codeItems: testItems,
        action: 'remove'
      })

      // removing all codesystem concepts deletes concept key
      expect(result2.concept).toBeUndefined()

      const result3 = updateCsCodes({
        codeSystem: testCodeSystem2,
        codeItems: testItems2,
        action: 'remove'
      })

      expect(result3.concept).toHaveLength(1)
    })
  })

  describe('createProvisionalCodeSystem', () => {
    const testCodeItems = [
      {
        code: 'code1',
        display: 'code 1', 
        definition: 'code 1 definition'
      },
      {
        code: 'code2',
        display: 'code 2', 
        definition: 'code 2 definition'
      }
    ]

    const result = createProvisionalCodeSystem({
      systemBaseUrl: 'www.test.com',
      codeItems: testCodeItems
    })
  })
})