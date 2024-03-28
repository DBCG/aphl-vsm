import { fhirCdrClient } from '@/fhirClients'
import getProgramAndGrouper from './getProgramAndGrouper'

jest.mock('fhirClients')

describe('getProgramAndGrouper', () => {
  it('should return grouperVSets and programLibrary', async () => {
    const programId = '123'
    const programLibrary = {
      status: 'active',
      relatedArtifact: [
        {
          type: 'composed-of',
          resource: 'http://example.com/Library/123|1.0.0'
        }
      ]
    }
    const grouperLibrarySearchBundle = {
      entry: [
        {
          resource: {
            id: 'rctc',
            relatedArtifact: [
              {
                type: 'composed-of',
                resource: 'http://example.com/ValueSet/123|1.0.0'
              }
            ]
          }
        }
      ]
    }
    const grouperVSets = [
      {
        id: '123',
        url: 'http://example.com/ValueSet/123',
        version: '1.0.0'
      }
    ]
    fhirCdrClient.read = jest.fn().mockResolvedValue(programLibrary)
    fhirCdrClient.search = jest
      .fn()
      .mockResolvedValueOnce(grouperLibrarySearchBundle)
      .mockResolvedValueOnce({
        entry: [
          {
            resource: {
              id: '123',
              url: 'http://example.com/ValueSet/123',
              version: '1.0.0'
            }
          }
        ]
      })

    const result = await getProgramAndGrouper(programId)

    expect(result).toEqual({ grouperVSets, programLibrary })
  })

  it('should return empty grouperVSets and programLibrary when grouperValueSetCanonicals is empty', async () => {
    const programId = '123'
    const programLibrary = {
      status: 'active',
      relatedArtifact: [
        {
          type: 'composed-of',
          resource: 'http://example.com/Library/123|1.0.0'
        }
      ]
    }
    const grouperLibrarySearchBundle = {
      entry: [
        {
          resource: {
            relatedArtifact: []
          }
        }
      ]
    }
    fhirCdrClient.read = jest.fn().mockResolvedValue(programLibrary)
    fhirCdrClient.search = jest.fn().mockResolvedValue(grouperLibrarySearchBundle)

    const result = await getProgramAndGrouper(programId)

    expect(result).toEqual({ grouperVSets: [], programLibrary })
  })

  it('should throw an error when grouperLibraryCanonical is not found', async () => {
    const programId = '123'
    const programLibrary = {
      status: 'active'
    }
    fhirCdrClient.read = jest.fn().mockResolvedValue(programLibrary)

    await expect(getProgramAndGrouper(programId)).rejects.toThrow('Could not get canonical reference')
  })
})
