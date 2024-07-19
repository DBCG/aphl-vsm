
import { createMocks } from 'node-mocks-http'
import { fhirCdrClient } from 'fhirClients'
import handler from '@/pages/api/programs/[id]/grouper/valueset'

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

describe('/api/programs/[id]/grouper/valueset', () => {
  test('POST /api/programs/[id]/grouper/valueset', async () => {
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

    fhirCdrClient.update = jest.fn().mockResolvedValueOnce({ resourceType: 'Library' })
    await handler(req, res)
    expect(fhirCdrClient.update).toHaveBeenCalledTimes(1)
    expect(fhirCdrClient.update).toHaveBeenCalledWith({
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
