import { createMocks } from 'node-mocks-http'
import FhirClient from '@/backend/clients/FhirClient'
import handler from '@/pages/api/programs/[id]'

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

describe('/api/programs/[id]', () => {
  test('GET /api/programs/[id]', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        id: '123'
      }
    })

    FhirClient.getInstance().read = jest.fn().mockResolvedValueOnce({ resourceType: 'Library' })
    await handler(req, res)
    expect(FhirClient.getInstance().read).toHaveBeenCalledTimes(1)
    expect(FhirClient.getInstance().read).toHaveBeenCalledWith({
      resourceType: 'Library',
      id: '123'
    })
    expect(res._getStatusCode()).toBe(200)
  })

  test('PUT /api/programs/[id]', async () => {
    const { req, res } = createMocks({
      method: 'PUT',
      body: {
        resourceType: 'Library',
        id: '123',
        status: 'draft',
        experimental: 'false',
        version: '1.0.0'
      },
      query: {
        id: '123',
        experimental: 'false'
      }
    })

    FhirClient.getInstance().update = jest.fn().mockResolvedValueOnce({ resourceType: 'Library' })
    await handler(req, res)
    expect(FhirClient.getInstance().update).toHaveBeenCalledTimes(1)
    expect(FhirClient.getInstance().update).toHaveBeenCalledWith({
      resourceType: 'Library',
      id: '123',
      body: {
        resourceType: 'Library',
        id: '123',
        status: 'draft',
        experimental: 'false',
        version: '1.0.0'
      }
    })
    expect(res._getStatusCode()).toBe(200)
  })

  test('PUT /api/programs/[id] editing active program', async () => {
    const { req, res } = createMocks({
      method: 'PUT',
      body: {
        resourceType: 'Library',
        id: '123',
        status: 'active',
        experimental: 'false',
        version: '1.0.0'
      },
      query: {
        id: '123',
        experimental: 'false'
      }
    })

    FhirClient.getInstance().update = jest.fn().mockResolvedValueOnce({ resourceType: 'Library' })
    await handler(req, res)
    expect(FhirClient.getInstance().update).toHaveBeenCalledTimes(0)
    expect(res._getStatusCode()).toBe(409)
  })

  test('PUT /api/programs/[id]?experimental=true Update experimental flag', async () => {
    const { req, res } = createMocks({
      method: 'PUT',
      body: {
        resourceType: 'Library',
        id: '123',
        status: 'draft',
        experimental: 'true',
        version: '1.0.0'
      },
      query: {
        id: '123',
        experimental: 'true'
      }
    })

    FhirClient.getInstance().update = jest.fn().mockResolvedValueOnce({ resourceType: 'Library' })
    await handler(req, res)
    expect(FhirClient.getInstance().update).toHaveBeenCalledTimes(1)
    expect(FhirClient.getInstance().update).toHaveBeenCalledWith({
      resourceType: 'Library',
      id: '123',
      body: {
        resourceType: 'Library',
        id: '123',
        status: 'draft',
        experimental: 'true',
        version: '1.0.0'
      }
    })
    expect(res._getStatusCode()).toBe(200)
  })
})
