import { createMocks } from 'node-mocks-http'
import handler, { ExpectedPackageBody, PackageResponse } from '@/pages/api/programs/[id]/package'
import fetchMock from 'jest-fetch-mock'
import exportResponse from '@/test_fixtures/ersd-export.json'
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

describe('/api/programs/[id]/package', () => {
  beforeEach(() => {
    // if you have an existing `beforeEach` just add the following line to it
    fetchMock.enableMocks()
  })

  afterEach(() => {
    fetchMock.resetMocks()
  })

  test('POST /api/programs/[id]/package, packages collection v2 bundle for download', async () => {
    const body: ExpectedPackageBody["body"] = {
      data: {
        json: true,
        parameters: {
          resourceType: 'Parameters'
        }
      }
    }
    const { req, res } = createMocks<ExpectedPackageBody, NextApiResponse<PackageResponse>>({
      method: 'POST',
      body: body,
      query: {
        id: 'SpecificationLibrary'
      }
    })

    fetchMock.mockResponseOnce(JSON.stringify(exportResponse))

    await handler(req, res)
    expect(res._getStatusCode()).toBe(200)
    expect(res._getData()).toEqual(exportResponse)
  })
})
