import { createMocks } from 'node-mocks-http'
import handler from '@/pages/api/jobs/[id]/result'
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
  hget: jest.fn()
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(Cache.getInstance as jest.Mock).mockResolvedValue(mockCache)
})

const makeJob = (state: string, returnvalue: any = null, failedReason: string | null = null) => ({
  getState: jest.fn().mockResolvedValue(state),
  returnvalue,
  failedReason,
  finishedOn: state === 'completed' || state === 'failed' ? Date.now() : null,
  processedOn: Date.now() - 1000
})

describe('GET /api/jobs/[id]/result', () => {
  test('returns 400 when job ID is missing', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {}
    })

    await handler(req, res)
    expect(res._getStatusCode()).toBe(400)
  })

  test('returns 404 when job type not found in cache', async () => {
    mockCache.hget.mockResolvedValue(null)

    const { req, res } = createMocks({
      method: 'GET',
      query: { id: 'job-123' }
    })

    await handler(req, res)
    expect(res._getStatusCode()).toBe(404)
  })

  test('returns result for a completed CHANGE_LOG job from VSPDiffQueue', async () => {
    const resultData = { changeLog: ['added VS1', 'removed VS2'] }
    const job = makeJob('completed', resultData)
    mockCache.hget.mockResolvedValue(JOB_TYPE.CHANGE_LOG)
    VSPDiffQueue.getJob = jest.fn().mockResolvedValue(job)

    const { req, res } = createMocks({
      method: 'GET',
      query: { id: 'job-123' }
    })

    await handler(req, res)
    expect(res._getStatusCode()).toBe(200)

    const data = JSON.parse(res._getData())
    expect(data.state).toBe('completed')
    expect(data.returnvalue).toEqual(resultData)
  })

  test('falls back to ChangeLogQueue for CHANGE_LOG jobs', async () => {
    const job = makeJob('completed', { changeLog: [] })
    mockCache.hget.mockResolvedValue(JOB_TYPE.CHANGE_LOG)
    VSPDiffQueue.getJob = jest.fn().mockResolvedValue(null)
    ChangeLogQueue.getJob = jest.fn().mockResolvedValue(job)

    const { req, res } = createMocks({
      method: 'GET',
      query: { id: 'job-123' }
    })

    await handler(req, res)
    expect(res._getStatusCode()).toBe(200)
  })

  test('returns result for EXPORT job from VSPPackageQueue', async () => {
    const job = makeJob('completed', { downloadUrl: '/download/pkg.zip' })
    mockCache.hget.mockResolvedValue(JOB_TYPE.EXPORT)
    VSPPackageQueue.getJob = jest.fn().mockResolvedValue(job)

    const { req, res } = createMocks({
      method: 'GET',
      query: { id: 'job-123' }
    })

    await handler(req, res)
    expect(res._getStatusCode()).toBe(200)

    const data = JSON.parse(res._getData())
    expect(data.state).toBe('completed')
  })

  test('falls back to PackageQueue for EXPORT jobs', async () => {
    const job = makeJob('completed', { downloadUrl: '/download/pkg.zip' })
    mockCache.hget.mockResolvedValue(JOB_TYPE.EXPORT)
    VSPPackageQueue.getJob = jest.fn().mockResolvedValue(null)
    PackageQueue.getJob = jest.fn().mockResolvedValue(job)

    const { req, res } = createMocks({
      method: 'GET',
      query: { id: 'job-123' }
    })

    await handler(req, res)
    expect(res._getStatusCode()).toBe(200)
  })

  test('returns result for FETCH_DEPENDENCIES job', async () => {
    const job = makeJob('completed', { dependencies: [] })
    mockCache.hget.mockResolvedValue(JOB_TYPE.FETCH_DEPENDENCIES)
    DependencyQueue.getJob = jest.fn().mockResolvedValue(job)

    const { req, res } = createMocks({
      method: 'GET',
      query: { id: 'job-123' }
    })

    await handler(req, res)
    expect(res._getStatusCode()).toBe(200)

    const data = JSON.parse(res._getData())
    expect(data.state).toBe('completed')
  })

  test('returns failed job with error reason', async () => {
    const job = makeJob('failed', null, 'Something went wrong')
    mockCache.hget.mockResolvedValue(JOB_TYPE.FETCH_DEPENDENCIES)
    DependencyQueue.getJob = jest.fn().mockResolvedValue(job)

    const { req, res } = createMocks({
      method: 'GET',
      query: { id: 'job-123' }
    })

    await handler(req, res)
    expect(res._getStatusCode()).toBe(200)

    const data = JSON.parse(res._getData())
    expect(data.state).toBe('failed')
    expect(data.error).toBe('Something went wrong')
  })

  test('returns 404 when job not found in queue', async () => {
    mockCache.hget.mockResolvedValue(JOB_TYPE.FETCH_DEPENDENCIES)
    DependencyQueue.getJob = jest.fn().mockResolvedValue(null)

    const { req, res } = createMocks({
      method: 'GET',
      query: { id: 'job-123' }
    })

    await handler(req, res)
    expect(res._getStatusCode()).toBe(404)
  })

  test('returns 400 for unsupported job type', async () => {
    mockCache.hget.mockResolvedValue('unknown-type')

    const { req, res } = createMocks({
      method: 'GET',
      query: { id: 'job-123' }
    })

    await handler(req, res)
    expect(res._getStatusCode()).toBe(400)
  })

  test('returns 500 on unexpected error', async () => {
    ;(Cache.getInstance as jest.Mock).mockRejectedValue(new Error('Cache error'))

    const { req, res } = createMocks({
      method: 'GET',
      query: { id: 'job-123' }
    })

    await handler(req, res)
    expect(res._getStatusCode()).toBe(500)
  })
})
