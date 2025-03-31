import { createMocks } from 'node-mocks-http'
import TerminologyFhirClient from '@/backend/clients/TerminologyFhirClient'
import FhirClient from '@/backend/clients/FhirCdrClient'
import handler from '@/pages/api/programs/[id]/manifest'

// Mock Auth for Setup
jest.mock('undici', () => jest.fn())
jest.mock('next-auth', () => jest.fn())
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn().mockImplementation(() => ({
    user: {
      roles: ['admin'],
      email: 'superman@gotham.com'
    }
  }))
}))
jest.mock('fhir-kit-client')

describe('/api/programs/[id]/manifest', () => {
  test('GET /api/programs/[id]/manifest?url=, retrieves versions for manifest', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        url: 'http://example.com'
      }
    })
    const vsacTerminologyClient = {
      search: jest.fn().mockResolvedValueOnce({
        resourceType: 'Bundle',
        type: 'searchset',
        entry: [
          {
            resource: {
              resourceType: 'CodeSystem',
              version: '1.0.0',
              id: '123-1.0.0',
              date: '2021-10-01'
            }
          }
        ]
      })
    }

    TerminologyFhirClient.getClient = jest.fn().mockImplementation(() => vsacTerminologyClient)
    await handler(req, res)
    expect(vsacTerminologyClient.search).toHaveBeenCalledTimes(1)
    expect(vsacTerminologyClient.search).toHaveBeenCalledWith({
      resourceType: 'CodeSystem',
      searchParams: {
        system: 'http://example.com'
      }
    })
    expect(res._getStatusCode()).toBe(200)
  })

  test('GET /api/programs/[id]/manifest, retrieves all available manifests', async () => {
    const { req, res } = createMocks({
      method: 'GET'
    })

    const fhirCdrClient = {
      search: jest.fn(),
      capabilityStatement: jest.fn().mockResolvedValueOnce({
        extension: [
          {
            extension: [
              {
                url: 'system',
                valueUri: 'http://example.com'
              },
              {
                url: 'version',
                valueString: '1.0.0'
              },
              {
                url: 'name',
                valueString: 'Test'
              }
            ]
          }
        ]
      })
    }

    TerminologyFhirClient.getClient = jest.fn().mockImplementation(() => fhirCdrClient)

    await handler(req, res)
    expect(fhirCdrClient.search).toHaveBeenCalledTimes(0)
    expect(fhirCdrClient.capabilityStatement).toHaveBeenCalledTimes(1)

    expect(res._getJSONData()).toEqual([{ uri: 'http://example.com', name: 'Test', latestVersion: '1.0.0' }])
    expect(res._getStatusCode()).toBe(200)
  })

  it('PUT /api/programs/[id]/manifest, updates the manifest', async () => {
    const { req, res } = createMocks({
      method: 'PUT',
      query: {
        id: 'SpecificationLibrary'
      },
      body: {
        'http://terminology.hl7.org/CodeSystem/v3-ActRelationshipType': ['2023-02-01']
      }
    })

    FhirClient.getInstance().read = jest.fn().mockResolvedValueOnce({
      resourceType: 'Library',
      status: 'draft',
      id: 'SpecificationLibrary',
      extension: []
    })

    FhirClient.getInstance().update = jest.fn().mockResolvedValueOnce({
      resourceType: 'CodeSystem',
      version: '2.0.0',
      id: '123-2.0.0',
      date: '2021-10-01'
    })

    TerminologyFhirClient.getClient = jest.fn().mockImplementation(() => FhirClient)

    await handler(req, res)
    expect(FhirClient.getInstance().read).toHaveBeenCalledTimes(1)
    expect(FhirClient.getInstance().update).toHaveBeenCalledTimes(1)
    expect(FhirClient.getInstance().update).toHaveBeenCalledWith({
      resourceType: 'Library',
      id: 'SpecificationLibrary',
      body: {
        resourceType: 'Library',
        status: 'draft',
        id: 'SpecificationLibrary',
        contained: [
          {
            id: 'expansion-parameters-ecr',
            parameter: [
              {
                name: 'system-version',
                valueString: 'http://terminology.hl7.org/CodeSystem/v3-ActRelationshipType|2023-02-01'
              }
            ],
            resourceType: 'Parameters'
          }
        ],
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/cqf-expansionParameters',
            valueReference: {
              reference: '#expansion-parameters-ecr'
            }
          }
        ]
      }
    })

    expect(res._getStatusCode()).toBe(200)
  })

  it('PUT /api/programs/[id]/manifest, cannot update active libraries', async () => {
    const { req, res } = createMocks({
      method: 'PUT',
      query: {
        id: 'SpecificationLibrary'
      },
      body: {
        'http://terminology.hl7.org/CodeSystem/v3-ActRelationshipType': ['2023-02-01']
      }
    })

    FhirClient.getInstance().read = jest.fn().mockResolvedValueOnce({
      resourceType: 'Library',
      status: 'active',
      id: 'SpecificationLibrary',
      extension: []
    })
    await handler(req, res)
    expect(res._getStatusCode()).toBe(400)
  })

  // TODO: Lots to stub for this operation
  // it('POST /api/programs/[id]/manifest, gets latest version of CodeSystem from unique set of CodeSystems dervied from leaf Valuesets', async () => {
  //   const { req, res } = createMocks({
  //     method: 'POST',
  //     query: {
  //       leafValueSets: true
  //     }
  //   })
  // })
})
