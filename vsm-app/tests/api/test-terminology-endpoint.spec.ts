import { createMocks } from 'node-mocks-http'
import { AUTHENTICATION_TYPE_URL, AUTH_TYPE } from '@/constants'

jest.mock('next-auth', () => jest.fn())
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn().mockImplementation(() => ({
    user: { id: 'user-123', roles: ['admin'], email: 'admin@example.com' }
  }))
}))

jest.mock('../../backend/clients/FhirCdrClient', () => ({
  __esModule: true,
  default: { getInstance: jest.fn() }
}))

jest.mock('../../backend/services/TsCredentialService', () => ({
  tsCredentialService: { getCredentials: jest.fn() }
}))

// Keep the factory self-contained — ESM imports are hoisted above any const, so
// referencing an outer variable here would hit the temporal dead zone.
jest.mock('fhir-kit-client', () => ({
  __esModule: true,
  default: jest.fn()
}))

import handler from '@/pages/api/test-terminology-endpoint'
import FhirClient from '@/backend/clients/FhirCdrClient'
import { tsCredentialService } from '@/backend/services/TsCredentialService'
import FhirKitClient from 'fhir-kit-client'

const mockFhirKitClientCtor = FhirKitClient as unknown as jest.Mock
const mockRequest = jest.fn()
const mockRead = jest.fn()

const makeEndpoint = (overrides: Partial<fhir4.Endpoint> = {}, authType?: string): fhir4.Endpoint => ({
  resourceType: 'Endpoint',
  id: '1001',
  status: 'active',
  connectionType: { code: 'fhir' },
  payloadType: [],
  address: 'https://tx.example.org/r4',
  ...(authType !== undefined && {
    extension: [{ url: AUTHENTICATION_TYPE_URL, valueString: authType }]
  }),
  ...overrides
})

const capabilityStatement = { resourceType: 'CapabilityStatement' }

beforeEach(() => {
  jest.clearAllMocks()
  ;(FhirClient.getInstance as jest.Mock).mockReturnValue({ read: mockRead })
  mockFhirKitClientCtor.mockImplementation(() => ({ request: mockRequest }))
})

const callHandler = async (query: Record<string, string>) => {
  const { req, res } = createMocks({ method: 'GET', query })
  await handler(req as any, res as any)
  return res
}

describe('GET /api/test-terminology-endpoint', () => {
  test('returns 400 when endpointId is missing', async () => {
    const res = await callHandler({})
    expect(res._getStatusCode()).toBe(400)
    expect(mockRead).not.toHaveBeenCalled()
  })

  test('returns 404 when the endpoint does not exist (read throws)', async () => {
    mockRead.mockRejectedValue(new Error('not found'))
    const res = await callHandler({ endpointId: '9999' })
    expect(res._getStatusCode()).toBe(404)
    expect(mockRequest).not.toHaveBeenCalled()
  })

  test('reads the endpoint by id, not via a windowed search', async () => {
    mockRead.mockResolvedValue(makeEndpoint({}, AUTH_TYPE.NONE))
    mockRequest.mockResolvedValue(capabilityStatement)
    await callHandler({ endpointId: '1001' })
    expect(mockRead).toHaveBeenCalledWith({ resourceType: 'Endpoint', id: '1001' })
  })

  test('no-auth endpoint that returns a CapabilityStatement is valid', async () => {
    mockRead.mockResolvedValue(makeEndpoint({}, AUTH_TYPE.NONE))
    mockRequest.mockResolvedValue(capabilityStatement)
    const res = await callHandler({ endpointId: '1001' })
    expect(res._getStatusCode()).toBe(200)
    expect(res._getJSONData()).toEqual({ status: 'ok' })
    // unauthenticated ping — no Authorization header
    expect(mockFhirKitClientCtor).toHaveBeenCalledWith(
      expect.objectContaining({ baseUrl: 'https://tx.example.org/r4', customHeaders: {} })
    )
  })

  test('basic-auth endpoint with no stored credentials returns no-credentials (does not ping)', async () => {
    mockRead.mockResolvedValue(makeEndpoint({}, AUTH_TYPE.BASIC))
    ;(tsCredentialService.getCredentials as jest.Mock).mockRejectedValue(new Error('no creds'))
    const res = await callHandler({ endpointId: '1001' })
    expect(res._getStatusCode()).toBe(200)
    expect(res._getJSONData()).toEqual({ status: 'no-credentials' })
    expect(mockRequest).not.toHaveBeenCalled()
  })

  test('basic-auth endpoint with credentials pings with a Basic auth header', async () => {
    mockRead.mockResolvedValue(makeEndpoint({}, AUTH_TYPE.BASIC))
    ;(tsCredentialService.getCredentials as jest.Mock).mockResolvedValue({ username: 'user', password: 'pass' })
    mockRequest.mockResolvedValue(capabilityStatement)
    const res = await callHandler({ endpointId: '1001' })
    expect(res._getStatusCode()).toBe(200)
    expect(res._getJSONData()).toEqual({ status: 'ok' })
    const expectedHeader = `Basic ${Buffer.from('user:pass').toString('base64')}`
    expect(mockFhirKitClientCtor).toHaveBeenCalledWith(
      expect.objectContaining({ customHeaders: { Authorization: expectedHeader } })
    )
  })

  test('returns 500 when the server response is not a CapabilityStatement', async () => {
    mockRead.mockResolvedValue(makeEndpoint({}, AUTH_TYPE.NONE))
    mockRequest.mockResolvedValue({ resourceType: 'OperationOutcome' })
    const res = await callHandler({ endpointId: '1001' })
    expect(res._getStatusCode()).toBe(500)
  })
})
