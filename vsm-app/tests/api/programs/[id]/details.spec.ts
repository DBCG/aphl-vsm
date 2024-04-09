import { createMocks } from 'node-mocks-http'
import { fhirCdrClient } from 'fhirClients'
import { fetchGrouperValueSets } from '@/helpers/server/serverValueSetHelper'
import handler from '@/pages/api/programs/[id]/details'

// Mock Auth for Setup
jest.mock('next-auth', () => jest.fn())
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn().mockImplementation(() => ({
    user: {
      roles: ['admin'],
      email: 'superman@gotham.com'
    }
  }))
}))
jest.mock('fhirClients')
jest.mock('../../../../helpers/server/serverValueSetHelper', () => ({
  fetchGrouperValueSets: jest.fn()
}))

describe('/api/programs/[id]/details', () => {
  test('GET /api/programs/[id]/details, retrieves details for program', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        url: 'http://example.com/library/123|122'
      }
    })

    fhirCdrClient.search = jest.fn().mockResolvedValueOnce({
      resourceType: 'Bundle',
      type: 'searchset',
      entry: [
        {
          resource: {
            resourceType: 'Library',
            id: 'rctc',
            relatedArtifact: [
              {
                resource: 'http://valueset.com/valueset/1'
              }
            ]
          }
        }
      ]
    })

    fetchGrouperValueSets.mockResolvedValue([
      {
        resource: 'Bundle',
        type: 'searchset',
        entry: [
          {
            resource: {
              resourceType: 'ValueSet',
              id: '123',
              name: 'grouper',
              title: 'title',
              url: 'url',
              version: 'version'
            }
          }
        ]
      }
    ])

    await handler(req, res)

    expect(fhirCdrClient.search).toHaveBeenCalledTimes(1)
    expect(fhirCdrClient.search).toHaveBeenCalledWith({
      resourceType: 'Library',
      searchParams: {
        url: 'http://example.com/library/123',
        version: '122'
      }
    })
    expect(fetchGrouperValueSets).toHaveBeenCalledTimes(1)

    expect(res._getStatusCode()).toBe(200)
    expect(res._getData()).toEqual({
      grouperLibrary: { id: 'rctc', relatedArtifact: [{ resource: 'http://valueset.com/valueset/1' }], resourceType: 'Library' },
      valueSets: [{ id: '123', name: 'grouper', title: 'title', url: 'url', version: 'version' }]
    })
  })

  test('PUT /api/programs/[id]/details, updates program and grouper', async () => {
    const { req, res } = createMocks({
      method: 'PUT',
      query: {
        url: 'http://example.com/library/123|122'
      },
      body: {
        vsUrl: 'http://valueset.com/valueset/2',
        grouperIds: ['123'],
        programId: 'SpecificationLibrary',
        priority: 'emergent'
      }
    })

    const inputLibrary = {
      resourceType: 'Library',
      id: 'SpecificationLibrary',
      relatedArtifact: [
        // should not change and carry over
        {
          resource: 'http://valueset.com/valueset/1',
          type: 'depends-on',
          extension: [{ url: 'http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-priority', valueString: 'emergent' }]
        },
        // should be modified to 'emergent'
        {
          resource: 'http://valueset.com/valueset/2|2024-01-22',
          type: 'depends-on',
          extension: [{ url: 'http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-priority', valueString: 'routine' }]
        }
      ]
    }

    // Retrieving program
    fhirCdrClient.read = jest
      .fn()
      .mockResolvedValueOnce(inputLibrary)
      .mockResolvedValueOnce({
        resourceType: 'ValueSet',
        id: '456',
        name: 'grouper',
        title: 'grouper',
        compose: {
          include: [{ valueSet: ['http://valueset.com/valueset/2|2024-01-22'] }]
        },
        url: 'url2'
      })

    await handler(req, res)

    expect(fhirCdrClient.update).toHaveBeenCalledTimes(1)
    expect(fhirCdrClient.update).toHaveBeenCalledWith({
      resourceType: 'Library',
      id: 'SpecificationLibrary',
      body: {
        ...inputLibrary,
        relatedArtifact: [
          {
            resource: 'http://valueset.com/valueset/1',
            type: 'depends-on',
            extension: [{ url: 'http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-priority', valueString: 'emergent' }]
          },
          {
            resource: 'http://valueset.com/valueset/2|2024-01-22',
            type: 'depends-on',
            extension: [
              {
                url: 'http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-priority',
                valueCodeableConcept: {
                  coding: [
                    {
                      code: 'emergent',
                      system: 'http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context'
                    }
                  ],
                  text: 'Emergent'
                }
              }
            ]
          }
        ]
      }
    })

    expect(res._getStatusCode()).toBe(200)
  })
})
