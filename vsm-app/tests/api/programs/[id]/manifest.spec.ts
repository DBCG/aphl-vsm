import { createMocks } from 'node-mocks-http'
import TerminologyFhirClient from '@/backend/clients/TerminologyFhirClient'
import FhirClient from '@/backend/clients/FhirCdrClient'
import handler from '@/pages/api/programs/[id]/manifest'
import { clearCatalogueCache } from '@/helpers/server/terminologyCapabilities'

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
  // The catalogue is cached per terminology server base URL.
  beforeEach(() => clearCatalogueCache())

  test('GET /api/programs/[id]/manifest?url=, lists every version the terminology server holds', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        url: 'http://example.com'
      }
    })
    const vsacTerminologyClient = {
      baseUrl: 'https://vsac.example.com/fhir',
      search: jest.fn(),
      request: jest.fn((path: string) =>
        Promise.resolve(
          path.startsWith('metadata')
            ? {
                resourceType: 'TerminologyCapabilities',
                codeSystem: [
                  {
                    uri: 'http://example.com',
                    version: [{ code: '2.0.0', isDefault: true }, { code: '1.0.0' }]
                  },
                  { uri: 'http://other.example.com', version: [{ code: '9.9.9' }] }
                ]
              }
            : { resourceType: 'Bundle', entry: [] }
        )
      )
    }

    TerminologyFhirClient.getClient = jest.fn().mockImplementation(() => vsacTerminologyClient)
    await handler(req, res)
    // A CodeSystem search only returns the current version, so the full list
    // comes from the catalogue.
    expect(vsacTerminologyClient.search).toHaveBeenCalledTimes(0)
    expect(vsacTerminologyClient.request).toHaveBeenCalledWith('metadata?mode=terminology')

    expect(res._getJSONData()).toEqual([
      { version: '2.0.0', id: 'http://example.com-2.0.0' },
      { version: '1.0.0', id: 'http://example.com-1.0.0' }
    ])
    expect(res._getStatusCode()).toBe(200)
  })

  test('GET /api/programs/[id]/manifest, retrieves all available manifests', async () => {
    const { req, res } = createMocks({
      method: 'GET'
    })

    const fhirCdrClient = {
      baseUrl: 'https://vsac.example.com/fhir',
      search: jest.fn(),
      capabilityStatement: jest.fn(),
      request: jest.fn((path: string) =>
        Promise.resolve(
          path.startsWith('metadata')
            ? {
                resourceType: 'TerminologyCapabilities',
                codeSystem: [
                  {
                    uri: 'http://example.com',
                    version: [
                      { code: '0.9.0', isDefault: false },
                      { code: '1.0.0', isDefault: true }
                    ]
                  }
                ]
              }
            : {
                resourceType: 'Bundle',
                entry: [{ resource: { resourceType: 'CodeSystem', url: 'http://example.com', name: 'Test' } }]
              }
        )
      )
    }

    TerminologyFhirClient.getClient = jest.fn().mockImplementation(() => fhirCdrClient)

    await handler(req, res)
    expect(fhirCdrClient.search).toHaveBeenCalledTimes(0)
    expect(fhirCdrClient.request).toHaveBeenCalledWith('metadata?mode=terminology')

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
