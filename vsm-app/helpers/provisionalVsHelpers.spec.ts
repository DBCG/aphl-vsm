import { addValueSetCodes } from './provisionalVsHelpers'

const TEST_VS_NO_CODES = {
  resourceType: 'ValueSet'
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
    console.log('result: ', result)
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