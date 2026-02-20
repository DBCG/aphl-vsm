import { createMocks } from 'node-mocks-http'
import handler from '@/pages/api/jobs/[id]/cancel'
import { JOB_TYPE } from '@/constants'

jest.mock('next-auth', () => jest.fn())
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn().mockImplementation(() => ({
    user: { id: 'user-123', roles: ['admin'], email: 'superman@gotham.com' }
  }))
}))

jest.mock('../../../../cache', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn()
  }
}))

jest.mock('../../../../worker/DependencyQueue', () => ({
  __esModule: true,
  default: { getJob: jest.fn() }
}))
jest.mock('../../../../worker/PackageQueue', () => ({
  __esModule: true,
  default: { getJob: jest.fn() }
}))
jest.mock('../../../../worker/VSPPackageQueue', () => ({
  __esModule: true,
  default: { getJob: jest.fn() }
}))
jest.mock('../../../../worker/ProgramReleaseQueue', () => ({
  __esModule: true,
  default: { getJob: jest.fn() }
}))
jest.mock('../../../../worker/ChangeLogQueue', () => ({
  __esModule: true,
  default: { getJob: jest.fn() }
}))
jest.mock('../../../../worker/VSPDiffQueue', () => ({
  __esModule: true,
  default: { getJob: jest.fn() }
}))

import Cache from '@/cache'
import DependencyQueue from '@/worker/DependencyQueue'
import PackageQueue from '@/worker/PackageQueue'
import VSPPackageQueue from '@/worker/VSPPackageQueue'
import ChangeLogQueue from '@/worker/ChangeLogQueue'
import VSPDiffQueue from '@/worker/VSPDiffQueue'

const mockCache = {
  hget: jest.fn(),
  hset: jest.fn()
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(Cache.getInstance as jest.Mock).mockResolvedValue(mockCache)
})

const makeJob = (state = 'active') => ({
  getState: jest.fn().mockResolvedValue(state),
  remove: jest.fn().mockResolvedValue(undefined)
})

describe('POST /api/jobs/[id]/cancel', () => {
  test('returns 400 when job ID is missing', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      query: {}
    })

    await handler(req, res)
    expect(res._getStatusCode()).toBe(400)
  })

  test('returns 404 when job type not found in cache', async () => {
    mockCache.hget.mockResolvedValue(null)

    const { req, res } = createMocks({
      method: 'POST',
      query: { id: 'job-123' }
    })

    await handler(req, res)
    expect(res._getStatusCode()).toBe(404)
  })

  test('cancels a FETCH_DEPENDENCIES job', async () => {
    const job = makeJob('active')
    mockCache.hget.mockResolvedValue(JOB_TYPE.FETCH_DEPENDENCIES)
    DependencyQueue.getJob = jest.fn().mockResolvedValue(job)

    const { req, res } = createMocks({
      method: 'POST',
      query: { id: 'job-123' }
    })

    await handler(req, res)
    expect(res._getStatusCode()).toBe(200)
    expect(job.remove).toHaveBeenCalled()
    expect(mockCache.hset).toHaveBeenCalled()
  })

  test('cancels an EXPORT job from VSPPackageQueue', async () => {
    const job = makeJob('active')
    mockCache.hget.mockResolvedValue(JOB_TYPE.EXPORT)
    VSPPackageQueue.getJob = jest.fn().mockResolvedValue(job)

    const { req, res } = createMocks({
      method: 'POST',
      query: { id: 'job-123' }
    })

    await handler(req, res)
    expect(res._getStatusCode()).toBe(200)
    expect(job.remove).toHaveBeenCalled()
  })

  test('falls back to PackageQueue for EXPORT jobs when not in VSPPackageQueue', async () => {
    const job = makeJob('active')
    mockCache.hget.mockResolvedValue(JOB_TYPE.EXPORT)
    VSPPackageQueue.getJob = jest.fn().mockResolvedValue(null)
    PackageQueue.getJob = jest.fn().mockResolvedValue(job)

    const { req, res } = createMocks({
      method: 'POST',
      query: { id: 'job-123' }
    })

    await handler(req, res)
    expect(res._getStatusCode()).toBe(200)
    expect(job.remove).toHaveBeenCalled()
  })

  test('cancels a CHANGE_LOG job from ChangeLogQueue', async () => {
    const job = makeJob('active')
    mockCache.hget.mockResolvedValue(JOB_TYPE.CHANGE_LOG)
    ChangeLogQueue.getJob = jest.fn().mockResolvedValue(job)

    const { req, res } = createMocks({
      method: 'POST',
      query: { id: 'job-123' }
    })

    await handler(req, res)
    expect(res._getStatusCode()).toBe(200)
    expect(job.remove).toHaveBeenCalled()
  })

  test('falls back to VSPDiffQueue for CHANGE_LOG jobs', async () => {
    const job = makeJob('active')
    mockCache.hget.mockResolvedValue(JOB_TYPE.CHANGE_LOG)
    ChangeLogQueue.getJob = jest.fn().mockResolvedValue(null)
    VSPDiffQueue.getJob = jest.fn().mockResolvedValue(job)

    const { req, res } = createMocks({
      method: 'POST',
      query: { id: 'job-123' }
    })

    await handler(req, res)
    expect(res._getStatusCode()).toBe(200)
    expect(job.remove).toHaveBeenCalled()
  })

  test('returns success when job is already completed', async () => {
    const job = makeJob('completed')
    mockCache.hget.mockResolvedValue(JOB_TYPE.FETCH_DEPENDENCIES)
    DependencyQueue.getJob = jest.fn().mockResolvedValue(job)

    const { req, res } = createMocks({
      method: 'POST',
      query: { id: 'job-123' }
    })

    await handler(req, res)
    expect(res._getStatusCode()).toBe(200)
    expect(job.remove).not.toHaveBeenCalled()
  })

  test('marks as cancelled when job not found in queue', async () => {
    mockCache.hget.mockResolvedValue(JOB_TYPE.FETCH_DEPENDENCIES)
    DependencyQueue.getJob = jest.fn().mockResolvedValue(null)

    const { req, res } = createMocks({
      method: 'POST',
      query: { id: 'job-123' }
    })

    await handler(req, res)
    expect(res._getStatusCode()).toBe(200)
    expect(mockCache.hset).toHaveBeenCalled()
  })

  test('returns 400 for unknown job type', async () => {
    mockCache.hget.mockResolvedValue('unknown-type')

    const { req, res } = createMocks({
      method: 'POST',
      query: { id: 'job-123' }
    })

    await handler(req, res)
    expect(res._getStatusCode()).toBe(400)
  })

  test('returns 500 on unexpected error', async () => {
    ;(Cache.getInstance as jest.Mock).mockRejectedValue(new Error('Cache error'))

    const { req, res } = createMocks({
      method: 'POST',
      query: { id: 'job-123' }
    })

    await handler(req, res)
    expect(res._getStatusCode()).toBe(500)
  })
})
