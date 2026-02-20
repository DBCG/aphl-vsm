import { createMocks } from 'node-mocks-http'
import handler from '@/pages/api/jobs/[id]'
import { NextApiRequest, NextApiResponse } from 'next'
import PackageQueue from '@/worker/PackageQueue'

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
jest.mock('../../../worker/PackageQueue', () => ({
  __esModule: true,
  default: {
    process: jest.fn()
  }
}))

jest.mock('../../../worker/DependencyQueue', () => ({
  __esModule: true,
  default: {
    process: jest.fn()
  }
}))

jest.mock('../../../worker/VSPPackageQueue', () => ({
  __esModule: true,
  default: {
    process: jest.fn()
  }
}))

describe('/api/jobs/[id]', () => {
  it('GET /api/jobs/[id]', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: {
        id: '123'
      }
    })

    PackageQueue.getJob = jest.fn().mockResolvedValue({ id: '123', status: 'completed' })
    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    expect(JSON.parse(res._getData())).toEqual({ id: '123', status: 'completed'})
  })

  it('GET /api/jobs/[id] - no id', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: {}
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(400)
  })
})
