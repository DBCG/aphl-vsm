import { createMocks } from 'node-mocks-http'
import { fhirCdrClient } from 'fhirClients'
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
jest.mock('fhirClients')

describe('/api/endpoint/[id]', () => {
  test('GET /api/endpoint/[id]', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse<fhir4.Endpoint | { error: string }>>({
      method: 'GET',
      query: {
        id: '123'
      }
    })

    fhirCdrClient.read = jest.fn().mockResolvedValueOnce({ resourceType: 'Endpoint' })
    await handler(req, res)
    expect(fhirCdrClient.read).toHaveBeenCalledTimes(1)
    expect(fhirCdrClient.read).toHaveBeenCalledWith({
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

    fhirCdrClient.delete = jest.fn().mockResolvedValueOnce({ resourceType: 'OperationOutcome' })
    await handler(req, res)
    // console.log(res.status)
    expect(fhirCdrClient.delete).toHaveBeenCalledTimes(1)
    expect(fhirCdrClient.delete).toHaveBeenCalledWith({
      resourceType: 'Endpoint',
      id: '123'
    })
    expect(res._getStatusCode()).toBe(200)
  })
})
