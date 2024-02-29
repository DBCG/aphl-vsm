import {
  addValueSetCodes,
  updateVsMetadata,
  generateProvisionalVs,
  CodesBySystem
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
        concept: [
          { code: 'abc', display: 'display-to-override' },
          { code: 'def', display: 'display-to-keep' }
        ]
      },
      {
        system: 'www.another-system.com',
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

describe('addValueSetCodes', () => {
  it('adds codes correctly if there is no compose.include block present', () => {
    const result = addValueSetCodes(TEST_VS_NO_CODES, TEST_CODES_TO_ADD)
    expect(result?.compose?.include).toStrictEqual([{
      system: 'www.system.com',
      concept: [
        { code: 'abc', display: 'overridden!' },
        { code: 'new-code', display: 'a brand new code' }
      ]
    }
    ])
  })

  it('adds codes correctly if there is an existing compose.include block present', () => {
    const result = addValueSetCodes(TEST_VS_EXISTING_CODES, TEST_CODES_TO_ADD)
    expect(result?.compose?.include).toStrictEqual([{
      system: 'www.system.com',
      concept: [
        // this shows 'abc' getting overridden via new data
        { code: 'abc', display: 'overridden!' },
        { code: 'new-code', display: 'a brand new code' },
        { code: 'def', display: 'display-to-keep' },
      ]
    },
    {
      system: 'www.another-system.com',
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
  
    const result = addValueSetCodes(TEST_VS_EXISTING_CODES, NEW_SYSTEM_ADDITIONS)
    expect(result?.compose?.include).toStrictEqual([
      {
        system: 'www.system.com',
        concept: [
          { code: 'abc', display: 'display-to-override' },
          { code: 'def', display: 'display-to-keep' }
        ]
      },
      {
        system: 'www.another-system.com',
        concept: [
          { code: '123', display: 'keep123' },
          { code: '456', display: 'keep456' }
        ]
      }, {
        system: 'new-system',
        concept: [{ code: 'new', display: 'new system!' }]
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
    expect(result?.extension).toHaveLength(2)
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
    expect(result?.name).toBe('Updated_title')

    // url created
    expect(result?.url).toContain('/fhir/ValueSet/Updated_title')
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
          display: 'test code 1'
        },
        {
          code: 'test-code-2',
          display: 'test code 2'
        }
      ],
      'http://test-system-2': [
        {
          code: 'test-code-3',
          display: 'test code 3'
        },
        {
          code: 'test-code-4',
          display: 'test code 4'
        }
      ]
    } as CodesBySystem

    const result = generateProvisionalVs({
      codesBySystemToAdd: codesBySystem,
      titleToUpdate,
      authorToUpdate,
      stewardToUpdate
    })

    expect(result?.extension).toHaveLength(2)
    // existing base provisional resource info should exist
    expect(result?.resourceType).toBe('ValueSet')
    expect(result?.status).toBe('draft')

    // correct number of codesystems and codes
    expect(result?.compose?.include).toHaveLength(2)
    expect(result?.compose?.include?.find(i => i?.system === 'http://test-system-1')?.concept).toHaveLength(2)
    expect(result?.compose?.include?.find(i => i?.system === 'http://test-system-2')?.concept).toHaveLength(2)
    // have already tested the ability of the internal fns to produce the right data
  })
})