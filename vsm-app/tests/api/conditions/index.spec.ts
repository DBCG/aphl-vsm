import handler from '@/pages/api/conditions'
import { fhirCdrClient } from 'fhirClients'

jest.mock('fhirClients')
// Mock Auth for Setup
jest.mock('next-auth', () => jest.fn())
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn().mockImplementation(() => ({
    user: {
      roles: ['admin']
    }
  }))
}))

describe('GET /api/conditions', () => {
  it('should get a list of conditions', async () => {
    const req = {
      method: 'GET'
    }
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    }

    fhirCdrClient.search = jest.fn()

    await handler(req, res)
    expect(fhirCdrClient.search).toHaveBeenCalledWith({
      resourceType: 'ValueSet',
      searchParams: {
        url: process.env.CONDITIONS_CANONICAL as string
      }
    })
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.send).toHaveBeenCalled()

  })
})