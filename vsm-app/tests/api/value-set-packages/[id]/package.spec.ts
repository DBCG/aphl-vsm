import { createMocks } from 'node-mocks-http'
import handler from '@/pages/api/value-set-packages/[id]/package'
import FhirClient from '@/backend/clients/FhirCdrClient'

jest.mock('next-auth', () => jest.fn())
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn().mockImplementation(() => ({
    user: { id: 'user-123', roles: ['admin'], email: 'superman@gotham.com' }
  }))
}))
jest.mock('fhir-kit-client')

jest.mock('../../../../cache', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn().mockResolvedValue({
      hset: jest.fn(),
      sadd: jest.fn(),
      expire: jest.fn()
    }),
    setNewJob: jest.fn().mockResolvedValue(undefined)
  }
}))

jest.mock('../../../../worker/VSPPackageQueue', () => ({
  __esModule: true,
  default: {
    add: jest.fn().mockResolvedValue({ id: 'job-789' }),
    process: jest.fn()
  }
}))

describe('POST /api/value-set-packages/[id]/package', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('returns 400 when VSP ID is missing', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      query: {},
      body: { data: { json: true } }
    })

    await handler(req, res)
    expect(res._getStatusCode()).toBe(400)
  })

  test('returns 400 when data is missing', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      query: { id: 'test-vsp-2026-01' },
      body: {}
    })

    await handler(req, res)
    expect(res._getStatusCode()).toBe(400)
  })

  test('queues a package job successfully', async () => {
    FhirClient.getInstance().read = jest.fn().mockResolvedValue({
      resourceType: 'Library',
      id: 'test-vsp-2026-01'
    })

    const { req, res } = createMocks({
      method: 'POST',
      query: { id: 'test-vsp-2026-01' },
      body: {
        data: { json: true },
        metadata: { title: 'Test VSP' }
      }
    })

    await handler(req, res)
    expect(res._getStatusCode()).toBe(200)
  })

  test('returns 500 when FHIR read fails', async () => {
    FhirClient.getInstance().read = jest.fn().mockRejectedValue(new Error('FHIR server error'))

    const { req, res } = createMocks({
      method: 'POST',
      query: { id: 'test-vsp-2026-01' },
      body: {
        data: { json: true }
      }
    })

    await handler(req, res)
    expect(res._getStatusCode()).toBe(500)
  })

  test('returns 404 when VSP not found', async () => {
    FhirClient.getInstance().read = jest.fn().mockResolvedValue(null)

    const { req, res } = createMocks({
      method: 'POST',
      query: { id: 'nonexistent-vsp' },
      body: {
        data: { json: true }
      }
    })

    await handler(req, res)
    expect(res._getStatusCode()).toBe(404)
  })
})
