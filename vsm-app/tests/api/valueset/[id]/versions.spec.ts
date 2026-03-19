import { createMocks } from 'node-mocks-http'
import FhirClient from '@/backend/clients/FhirCdrClient'
import handler from '@/pages/api/valueset/[id]/versions'

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

describe('/api/valueset/[id]/versions', () => {
  // commenting this out because it doesn't work this way anymore
  // test('GET /api/valueset/[id]/versions, retrieves versions for valueset', async () => {
  //   const { req, res } = createMocks({
  //     method: 'GET',
  //     query: {
  //       id: '123'
  //     }
  //   })

  //   const vsacTerminologyClient = {
  //     search: jest.fn().mockResolvedValueOnce({
  //       resourceType: 'Bundle',
  //       type: 'searchset',
  //       entry: [
  //         {
  //           resource: {
  //             resourceType: 'ValueSet',
  //             version: '1.0.0',
  //             id: '123-1.0.0',
  //             date: '2021-10-01'
  //           }
  //         }
  //       ]
  //     })
  //   }

  //   terminologyClient.getClient = jest.fn().mockImplementation(() => vsacTerminologyClient)
  //   FhirClient.getInstance().read = jest.fn().mockResolvedValueOnce({
  //     resourceType: 'ValueSet',
  //     id: '123',
  //     extension: [
  //       {
  //         url: 'http://hl7.org/fhir/StructureDefinition/valueset-authoritativeSource',
  //         valueUri: 'https://cts.nlm.nih.gov/fhir'
  //       }
  //     ],
  //     url: 'http://example.com',
  //     version: '1.0.0'
  //   })

  //   await handler(req, res)

  //   expect(FhirClient.getInstance().read).toHaveBeenCalledTimes(1)
  //   expect(FhirClient.getInstance().read).toHaveBeenCalledWith({
  //     resourceType: 'ValueSet',
  //     id: '123'
  //   })
  //   expect(vsacTerminologyClient.search).toHaveBeenCalledTimes(0)
  //   expect(vsacTerminologyClient.search).toHaveBeenCalledWith({
  //     resourceType: 'ValueSet',
  //     searchParams: {
  //       url: 'http://example.com'
  //     }
  //   })
  //   expect(res._getStatusCode()).toBe(200)
  //   expect(res._getJSONData()).toEqual(['1.0.0'])
  // })

  test('GET /api/valueset/[id]/versions, 404 for missing terminology source', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        id: '123'
      }
    })

    FhirClient.getInstance().read = jest.fn().mockResolvedValueOnce({
      resourceType: 'ValueSet',
      id: '123',
      extension: [],
      url: 'http://example.com',
      version: '1.0.0'
    })

    await handler(req, res)

    expect(FhirClient.getInstance().read).toHaveBeenCalledTimes(1)
    expect(FhirClient.getInstance().read).toHaveBeenCalledWith({
      resourceType: 'ValueSet',
      id: '123'
    })
    expect(res._getJSONData()).toEqual({ error: 'Leaf valueset lacks authoritative source' })
    expect(res._getStatusCode()).toBe(404)
  })

  test('GET /api/valueset/[id]/versions, 404 for missing valueset', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        id: '123'
      }
    })

    FhirClient.getInstance().read = jest.fn().mockRejectedValueOnce({
      error: 'Not Found'
    })

    await handler(req, res)

    expect(FhirClient.getInstance().read).toHaveBeenCalledTimes(1)
    expect(FhirClient.getInstance().read).toHaveBeenCalledWith({
      resourceType: 'ValueSet',
      id: '123'
    })
    expect(res._getJSONData()).toEqual({ error: 'Error finding ValueSet with id 123.' })
    expect(res._getStatusCode()).toBe(404)
  })

  test('GET /api/valueset/[id]/versions, 404 for missing query id', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {}
    })

    await handler(req, res)
    expect(res._getJSONData()).toEqual({ error: 'ID not valid: undefined.' })
    expect(res._getStatusCode()).toBe(400)
  })
})
