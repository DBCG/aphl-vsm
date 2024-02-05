import handler from '@/pages/api/conditions'
import { fhirCdrClient } from 'fhirClients'
import { NextApiRequest, NextApiResponse } from 'next'

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

interface Request extends NextApiRequest {
  method: 'GET'
}

describe('GET /api/conditions', () => {
  it('should get a list of conditions', async () => {
    const req = {
      method: 'GET'
    } as Request

    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    } as any

    // @ts-ignore-next-line
    fhirCdrClient.search = jest.fn(() => ({
      entry: [ {
        resource: {
          resourceType: 'ValueSet',
          compose: {
            include: [
              { valueSet: ['www.test-vs.com/ValueSet/12345']},
              { valueSet: ['www.test-vs.com/ValueSet/123456']}
            ]
          }
        }
      }]
    }))

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