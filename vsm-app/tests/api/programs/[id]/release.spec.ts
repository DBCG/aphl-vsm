import { createMocks } from 'node-mocks-http'
import { fhirCdrClient } from 'fhirClients'
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
jest.mock('fhirClients')

describe('/api/programs/[id]/release', () => {
  test('POST /api/programs/[id]/release, releases a program', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      query: {
        id: 'SpecificationLibrary'
      },
      body: {
        releaseAsVersion: '2.2.2',
        program: {
          id: 'SpecificationLibrary',
          name: 'Test Program',
          extension: [
            {
              url: 'http://hl7.org/fhir/StructureDefinition/artifact-releaseLabel',
              valueString: 'ReleaseV2.2.2'
            },
            {
              url: 'http://hl7.org/fhir/StructureDefinition/artifact-releaseDescription',
              valueMarkdown: 'Release Description'
            }
          ],
          version: '1.0.0',
          description: 'Test Program Description'
        }
      }
    })

    fhirCdrClient.update = jest.fn().mockResolvedValue({})
    fhirCdrClient.operation = jest.fn().mockResolvedValue({})

    await handler(req, res)

    expect(fhirCdrClient.update).toHaveBeenCalledTimes(1)
    expect(fhirCdrClient.update).toHaveBeenCalledWith({
      resourceType: 'Library',
      id: 'SpecificationLibrary',
      body: {
        id: 'SpecificationLibrary',
        name: 'Test Program',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/artifact-releaseLabel',
            valueString: 'ReleaseV2.2.2'
          },
          {
            url: 'http://hl7.org/fhir/StructureDefinition/artifact-releaseDescription',
            valueMarkdown: 'Release Description'
          }
        ],
        version: '2.2.2',
        description: 'Test Program Description'
      }
    })

    expect(fhirCdrClient.operation).toHaveBeenCalledTimes(1)
    expect(fhirCdrClient.operation).toHaveBeenCalledWith({
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
        program: {
          id: 'SpecificationLibrary',
          name: 'Test Program',
          extension: [],
          version: '1.0.0',
          description: 'Test Program Description'
        }
      }
    })

    fhirCdrClient.update = jest.fn().mockResolvedValue({})
    fhirCdrClient.operation = jest.fn().mockResolvedValue({})

    await handler(req, res)

    expect(fhirCdrClient.update).toHaveBeenCalledTimes(0)
    expect(fhirCdrClient.operation).toHaveBeenCalledTimes(0)

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
        program: {
          id: 'SpecificationLibrary',
          name: 'Test Program',
          extension: [
            {
              url: 'http://hl7.org/fhir/StructureDefinition/artifact-releaseLabel',
              valueString: 'ReleaseV2.2.2'
            },
            {
              url: 'http://hl7.org/fhir/StructureDefinition/artifact-releaseDescription',
              valueMarkdown: 'Release Description'
            }
          ],
          version: '1.0.0',
          description: 'Test Program Description'
        }
      }
    })

    fhirCdrClient.update = jest.fn().mockRejectedValue({})

    await handler(req, res)

    expect(fhirCdrClient.update).toHaveBeenCalledTimes(1)
    expect(fhirCdrClient.operation).toHaveBeenCalledTimes(0)

    expect(res._getStatusCode()).toBe(500)
    expect(res._getData()).toEqual({ error: 'Error encountered updating Library for release' })
  })
})
