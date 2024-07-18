import { createMocks } from 'node-mocks-http'
import { fhirCdrClient } from 'fhirClients'
import handler, { TestRequest } from '@/pages/api/endpoint/test'
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

describe('/api/endpoint/test', () => {
  test('POST /api/endpoint/test', async () => {
    const { req, res } = createMocks<TestRequest, NextApiResponse>({
      method: 'POST',
      body: {
        endpoint: 'www.google.com'
      }
    })

    global.fetch = jest.fn().mockResolvedValueOnce("success")
    await handler(req, res)
    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(global.fetch).toHaveBeenCalledWith(req.body.endpoint, { method: 'HEAD' })
    expect(res._getStatusMessage()).toBe("OK")
  })
})
