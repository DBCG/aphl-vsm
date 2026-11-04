import { createMocks } from 'node-mocks-http'
import handler from '@/pages/api/jobs/[id]'
import { NextApiRequest, NextApiResponse } from 'next'

// Mock Auth for Setup
jest.mock('next-auth', () => jest.fn())
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn().mockImplementation(() => ({
    user: {
      id: 'user-123',
      roles: ['admin'],
      email: 'superman@gotham.com'
    }
  }))
}))

jest.mock('../../../cache', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn()
  }
}))

jest.mock('../../../worker/PackageQueue', () => ({ __esModule: true, default: { process: jest.fn(), getJob: jest.fn() } }))
jest.mock('../../../worker/DependencyQueue', () => ({ __esModule: true, default: { process: jest.fn(), getJob: jest.fn() } }))
jest.mock('../../../worker/VSPPackageQueue', () => ({ __esModule: true, default: { process: jest.fn(), getJob: jest.fn() } }))
jest.mock('../../../worker/VSPReleaseQueue', () => ({ __esModule: true, default: { process: jest.fn(), getJob: jest.fn() } }))
jest.mock('../../../worker/ChangeLogQueue', () => ({ __esModule: true, default: { process: jest.fn(), getJob: jest.fn() } }))
jest.mock('../../../worker/VSPDiffQueue', () => ({ __esModule: true, default: { process: jest.fn(), getJob: jest.fn() } }))
jest.mock('../../../worker/ProgramReleaseQueue', () => ({ __esModule: true, default: { process: jest.fn(), getJob: jest.fn() } }))

import Cache from '@/cache'
import PackageQueue from '@/worker/PackageQueue'
import VSPPackageQueue from '@/worker/VSPPackageQueue'
import VSPReleaseQueue from '@/worker/VSPReleaseQueue'
import DependencyQueue from '@/worker/DependencyQueue'
import ChangeLogQueue from '@/worker/ChangeLogQueue'
import VSPDiffQueue from '@/worker/VSPDiffQueue'
import ProgramReleaseQueue from '@/worker/ProgramReleaseQueue'

const allQueues = [
  PackageQueue,
  VSPPackageQueue,
  VSPReleaseQueue,
  DependencyQueue,
  ChangeLogQueue,
  VSPDiffQueue,
  ProgramReleaseQueue
]

const mockCache = {
  del: jest.fn().mockResolvedValue(1),
  srem: jest.fn().mockResolvedValue(1),
  sismember: jest.fn().mockResolvedValue(1)
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(Cache.getInstance as jest.Mock).mockResolvedValue(mockCache)
  // Default: caller owns the job
  mockCache.sismember.mockResolvedValue(1)
  // Default: job is not present in any queue
  allQueues.forEach((q) => {
    ;(q.getJob as jest.Mock).mockResolvedValue(null)
  })
})

describe('GET /api/jobs/[id]', () => {
  it('returns the job when found in a queue', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: { id: '123' }
    })

    PackageQueue.getJob = jest.fn().mockResolvedValue({ id: '123', status: 'completed' })
    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    expect(JSON.parse(res._getData())).toEqual({ id: '123', status: 'completed' })
  })

  it('returns 400 when no id is provided', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: {}
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(400)
  })
})

describe('DELETE /api/jobs/[id]', () => {
  test('returns 400 when job id is missing', async () => {
    const { req, res } = createMocks({ method: 'DELETE', query: {} })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(400)
    expect(mockCache.del).not.toHaveBeenCalled()
  })

  test('deletes the cache entry and removes the job from the user job set', async () => {
    const { req, res } = createMocks({ method: 'DELETE', query: { id: 'job-123' } })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    expect(mockCache.del).toHaveBeenCalledWith('user:user-123:job:job-123')
    expect(mockCache.srem).toHaveBeenCalledWith('user:user-123:jobs', 'job-123')
  })

  test('removes the underlying Bull job from whichever queue holds it', async () => {
    const bullJob = { remove: jest.fn().mockResolvedValue(undefined) }
    ;(VSPReleaseQueue.getJob as jest.Mock).mockResolvedValue(bullJob)

    const { req, res } = createMocks({ method: 'DELETE', query: { id: 'job-123' } })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    expect(bullJob.remove).toHaveBeenCalled()
  })

  test('still succeeds when the job is not found in any queue', async () => {
    const { req, res } = createMocks({ method: 'DELETE', query: { id: 'job-404' } })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    expect(mockCache.del).toHaveBeenCalledWith('user:user-123:job:job-404')
  })

  test('does not fail the request when a queue remove throws', async () => {
    ;(VSPReleaseQueue.getJob as jest.Mock).mockResolvedValue({
      remove: jest.fn().mockRejectedValue(new Error('locked'))
    })

    const { req, res } = createMocks({ method: 'DELETE', query: { id: 'job-123' } })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
  })

  test('returns 404 and does not touch any queue when the job is not the caller\'s', async () => {
    mockCache.sismember.mockResolvedValue(0)
    const bullJob = { remove: jest.fn().mockResolvedValue(undefined) }
    ;(VSPReleaseQueue.getJob as jest.Mock).mockResolvedValue(bullJob)

    const { req, res } = createMocks({ method: 'DELETE', query: { id: 'someone-elses-job' } })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(404)
    // ownership check gates everything: no cache mutation, no Bull job removal
    expect(mockCache.del).not.toHaveBeenCalled()
    expect(mockCache.srem).not.toHaveBeenCalled()
    expect(bullJob.remove).not.toHaveBeenCalled()
  })
})
