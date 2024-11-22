import { createMocks } from 'node-mocks-http'
import FhirClient from '@/backend/clients/FhirClient'
import handler from '@/pages/api/endpoint/[id]'
import { NextApiRequest, NextApiResponse } from 'next'

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

describe('/api/endpoint/[id]', () => {
  test('GET /api/endpoint/[id]', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse<fhir4.Endpoint | { error: string }>>({
      method: 'GET',
      query: {
        id: '123'
      }
    })

    FhirClient.getInstance().read = jest.fn().mockResolvedValueOnce({ resourceType: 'Endpoint' })
    await handler(req, res)
    expect(FhirClient.getInstance().read).toHaveBeenCalledTimes(1)
    expect(FhirClient.getInstance().read).toHaveBeenCalledWith({
      resourceType: 'Endpoint',
      id: '123'
    })
    expect(res._getStatusCode()).toBe(200)
  })

  test('DELETE /api/programs/[id]', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse<fhir4.OperationOutcome | { error: string }>>({
      method: 'DELETE',
      query: {
        id: '123'
      }
    })

    FhirClient.getInstance().delete = jest.fn().mockResolvedValueOnce({ resourceType: 'OperationOutcome' })
    await handler(req, res)
    expect(FhirClient.getInstance().delete).toHaveBeenCalledTimes(1)
    expect(FhirClient.getInstance().delete).toHaveBeenCalledWith({
      resourceType: 'Endpoint',
      id: '123'
    })
    expect(res._getStatusCode()).toBe(200)
  })
})
