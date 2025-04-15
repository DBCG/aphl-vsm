import { createMocks } from 'node-mocks-http'
import handler from '@/pages/api/jobs'
import { NextApiRequest, NextApiResponse } from 'next'
import PackageQueue from '@/worker/PackageQueue'
import ChangeLogQueue from '@/worker/ChangeLogQueue'
import ProgramReleaseQueue from '@/worker/ProgramReleaseQueue'

// Mock Auth for Setup
jest.mock('next-auth', () => jest.fn())
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn().mockImplementation(() => ({
    user: {
      id: '1',
      roles: ['admin'],
      email: 'superman@gotham.com'
    }
  }))
}))

// jest.mock('../../../cache')
jest.mock('../../../cache', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn()
  }
}))

jest.mock('../../../worker/PackageQueue', () => ({
  __esModule: true,
  default: {
    process: jest.fn()
  }
}))

jest.mock('../../../worker/ChangeLogQueue', () => ({
  __esModule: true,
  default: {
    process: jest.fn()
  }
}))

jest.mock('../../../worker/ProgramReleaseQueue', () => ({
  __esModule: true,
  default: {
    process: jest.fn()
  }
}))

import Cache from '@/cache'


describe('/api/jobs', () => {
  it('GET /api/jobs', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET'
    })
    Cache.getInstance.mockReturnValue({});
    Cache.getInstance().smembers = jest.fn().mockImplementation(() => ['1', '2'])
    Cache.getInstance().multi = jest.fn().mockImplementation(() => ({
      hgetall: jest.fn(),
      exec: jest.fn().mockImplementation(() => [
        [null, { jobId: '1' }],
        [null, { jobId: '2' }]
      ])
    }))

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    expect(res._getData()).toEqual("{\"1\":{\"jobId\":\"1\"},\"2\":{\"jobId\":\"2\"}}")
  })

  it('DELETE /api/jobs', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'DELETE'
    })
    Cache.getInstance.mockReturnValue({});
    Cache.getInstance().smembers = jest.fn().mockImplementation(() => ['1', '2'])
    Cache.getInstance().multi = jest.fn().mockImplementation(() => ({
      hgetall: jest.fn(),
      del: jest.fn(),
      exec: jest.fn().mockImplementation(() => [
        [null, { jobId: '1' }],
        [null, { jobId: '2' }]
      ])
    }))
    Cache.getInstance().del = jest.fn()

    PackageQueue.getJob = jest.fn().mockReturnValue(Promise.resolve({ remove: jest.fn() }))
    ChangeLogQueue.getJob = jest.fn().mockReturnValue(Promise.resolve({ remove: jest.fn() }))
    ProgramReleaseQueue.getJob = jest.fn().mockReturnValue(Promise.resolve({ remove: jest.fn() }))
  
    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    expect(Cache.getInstance().del).toHaveBeenCalledWith('user:1:jobs')
  })
})
