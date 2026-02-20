import { createMocks } from 'node-mocks-http'
import handler from '@/pages/api/implementation-guides/dependencies'

jest.mock('next-auth', () => jest.fn())
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn().mockImplementation(() => ({
    user: { id: 'user-123', roles: ['admin'], email: 'superman@gotham.com' }
  }))
}))

jest.mock('../../../worker/DependencyQueue', () => ({
  __esModule: true,
  default: {
    add: jest.fn()
  }
}))

import DependencyQueue from '@/worker/DependencyQueue'

beforeEach(() => {
  jest.clearAllMocks()
})

describe('POST /api/implementation-guides/dependencies', () => {
  test('starts a dependency fetch job successfully', async () => {
    ;(DependencyQueue.add as jest.Mock).mockResolvedValue({ id: 'job-456' })

    const { req, res } = createMocks({
      method: 'POST',
      query: {
        igCanonical: 'http://hl7.org/fhir/us/core/ImplementationGuide/hl7.fhir.us.core|6.1.0',
        igPackageId: 'hl7.fhir.us.core'
      }
    })

    await handler(req, res)
    expect(res._getStatusCode()).toBe(200)

    const data = JSON.parse(res._getData())
    expect(data.success).toBe(true)
    expect(data.jobId).toBe('job-456')
  })

  test('passes correct data to DependencyQueue', async () => {
    ;(DependencyQueue.add as jest.Mock).mockResolvedValue({ id: 'job-456' })

    const igCanonical = 'http://hl7.org/fhir/us/core/ImplementationGuide/hl7.fhir.us.core|6.1.0'
    const { req, res } = createMocks({
      method: 'POST',
      query: {
        igCanonical,
        igPackageId: 'hl7.fhir.us.core'
      }
    })

    await handler(req, res)

    expect(DependencyQueue.add).toHaveBeenCalledWith(
      expect.objectContaining({
        igCanonical,
        igPackageId: 'hl7.fhir.us.core',
        userId: 'user-123'
      }),
      expect.any(Object)
    )
  })

  test('returns 400 when igCanonical is missing', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      query: { igPackageId: 'hl7.fhir.us.core' }
    })

    await handler(req, res)
    expect(res._getStatusCode()).toBe(400)

    const data = JSON.parse(res._getData())
    expect(data.success).toBe(false)
    expect(data.error).toContain('igCanonical')
  })

  test('returns 400 when igPackageId is missing', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      query: {
        igCanonical: 'http://hl7.org/fhir/us/core/ImplementationGuide/hl7.fhir.us.core|6.1.0'
      }
    })

    await handler(req, res)
    expect(res._getStatusCode()).toBe(400)

    const data = JSON.parse(res._getData())
    expect(data.success).toBe(false)
    expect(data.error).toContain('igPackageId')
  })

  test('returns 400 when igCanonical has no version', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      query: {
        igCanonical: 'http://hl7.org/fhir/us/core/ImplementationGuide/hl7.fhir.us.core',
        igPackageId: 'hl7.fhir.us.core'
      }
    })

    await handler(req, res)
    expect(res._getStatusCode()).toBe(400)

    const data = JSON.parse(res._getData())
    expect(data.success).toBe(false)
  })

  test('returns 500 when queue fails', async () => {
    ;(DependencyQueue.add as jest.Mock).mockRejectedValue(new Error('Queue connection failed'))

    const { req, res } = createMocks({
      method: 'POST',
      query: {
        igCanonical: 'http://hl7.org/fhir/us/core/ImplementationGuide/hl7.fhir.us.core|6.1.0',
        igPackageId: 'hl7.fhir.us.core'
      }
    })

    await handler(req, res)
    expect(res._getStatusCode()).toBe(500)

    const data = JSON.parse(res._getData())
    expect(data.success).toBe(false)
  })
})
