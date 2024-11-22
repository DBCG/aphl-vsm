import { createMocks } from 'node-mocks-http'
import FhirClient from '@/backend/clients/FhirClient'
import handler from '@/pages/api/programs/[id]/approve'

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

describe('/api/programs/[id]/approve', () => {
  test('should call $approve', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        resourceType: 'Parameters',
        parameter: []
      },
      query: {
        id: '123'
      }
    })

    await handler(req, res)
    expect(FhirClient.getInstance().operation).toHaveBeenCalledTimes(1)
    expect(FhirClient.getInstance().operation).toHaveBeenCalledWith({
      name: '$approve',
      resourceType: 'Library',
      id: '123',
      method: 'POST',
      input: {
        resourceType: 'Parameters',
        parameter: [{ name: 'artifactAssessmentAuthor', valueReference: { reference: 'superman@gotham.com' } }]
      }
    })
  })

  test('should return 500 on error', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        resourceType: 'Parameters',
        parameter: []
      },
      query: {
        id: '123'
      }
    })

    FhirClient.getInstance().operation = jest.fn().mockRejectedValueOnce(new Error('Test Error'))
    await handler(req, res)
    expect(res._getStatusCode()).toBe(500)
  })
})
