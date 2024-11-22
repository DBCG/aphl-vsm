import { createMocks } from 'node-mocks-http'
import FhirClient from '@/backend/clients/FhirClient'
import handler from '@/pages/api/programs/[id]/release'

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
jest.mock('fhir-kit-client')

describe('/api/programs/[id]/release', () => {
  test('POST /api/programs/[id]/release, releases a program', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      query: {
        id: 'SpecificationLibrary'
      },
      body: {
        releaseAsVersion: '2.2.2',
        releaseDescription: 'Release Description',
        releaseLabel: 'ReleaseV2.2.2',
        effectiveStartDate: '2022-01-01'
      }
    })

    FhirClient.getInstance().read = jest.fn().mockResolvedValue({
      id: 'SpecificationLibrary',
      name: 'Test Program',
      extension: [],
      version: '1.0.0',
      description: 'Test Program Description'
    })
    FhirClient.getInstance().update = jest.fn().mockResolvedValue({})
    FhirClient.getInstance().operation = jest.fn().mockResolvedValue({})

    await handler(req, res)

    expect(FhirClient.getInstance().update).toHaveBeenCalledTimes(1)
    expect(FhirClient.getInstance().update).toHaveBeenCalledWith({
      resourceType: 'Library',
      id: 'SpecificationLibrary',
      body: {
        id: 'SpecificationLibrary',
        name: 'Test Program',
        effectivePeriod: {
          start: '2022-01-01'
        },
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/artifact-releaseDescription',
            valueMarkdown: 'Release Description'
          },
          {
            url: 'http://hl7.org/fhir/StructureDefinition/artifact-releaseLabel',
            valueString: 'ReleaseV2.2.2'
          }
        ],
        version: '2.2.2',
        description: 'Test Program Description'
      }
    })

    expect(FhirClient.getInstance().operation).toHaveBeenCalledTimes(1)
    expect(FhirClient.getInstance().operation).toHaveBeenCalledWith({
      name: '$release',
      resourceType: 'Library',
      id: 'SpecificationLibrary',
      method: 'POST',
      input: {
        resourceType: 'Parameters',
        parameter: [
          {
            name: 'version',
            valueString: '2.2.2'
          },
          {
            name: 'versionBehavior',
            valueCode: 'force'
          }
        ]
      }
    })

    expect(res._getStatusCode()).toBe(200)
  })

  test('POST /api/programs/[id]/release, does not update when label or description missing', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      query: {
        id: 'SpecificationLibrary'
      },
      body: {
        releaseAsVersion: '2.2.2',
        releaseDescription: undefined,
        releaseLabel: undefined,
        effectiveStartDate: '2022-01-01'
      }
    })

    FhirClient.getInstance().read = jest.fn().mockResolvedValue({
      id: 'SpecificationLibrary',
      name: 'Test Program',
      extension: [],
      version: '1.0.0',
      description: 'Test Program Description'
    })
    FhirClient.getInstance().update = jest.fn().mockResolvedValue({})
    FhirClient.getInstance().operation = jest.fn().mockResolvedValue({})

    await handler(req, res)

    expect(FhirClient.getInstance().update).toHaveBeenCalledTimes(0)
    expect(FhirClient.getInstance().operation).toHaveBeenCalledTimes(0)

    expect(res._getStatusCode()).toBe(400)
    expect(res._getData()).toEqual({ error: 'Release must have label and description set' })
  })

  test('POST /api/programs/[id]/release, error while updating', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      query: {
        id: 'SpecificationLibrary'
      },
      body: {
        releaseAsVersion: '2.2.2',
        releaseDescription: 'Release Description',
        releaseLabel: 'ReleaseV2.2.2',
        effectiveStartDate: '2022-01-01'
      }
    })

    FhirClient.getInstance().read = jest.fn().mockResolvedValue({
      id: 'SpecificationLibrary',
      name: 'Test Program',
      extension: [],
      version: '1.0.0',
      description: 'Test Program Description'
    })
    FhirClient.getInstance().update = jest.fn().mockRejectedValue({})

    await handler(req, res)

    expect(FhirClient.getInstance().update).toHaveBeenCalledTimes(1)
    expect(FhirClient.getInstance().operation).toHaveBeenCalledTimes(0)

    expect(res._getStatusCode()).toBe(500)
    expect(res._getData()).toEqual({ error: 'Error encountered updating Library for release' })
  })
})
