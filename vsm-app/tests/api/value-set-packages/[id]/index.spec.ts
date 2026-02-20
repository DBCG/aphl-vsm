import { createMocks } from 'node-mocks-http'
import FhirClient from '@/backend/clients/FhirCdrClient'
import handler from '@/pages/api/value-set-packages/[id]/index'

jest.mock('next-auth', () => jest.fn())
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn().mockImplementation(() => ({
    user: { roles: ['admin'], email: 'superman@gotham.com' }
  }))
}))
jest.mock('fhir-kit-client')

const makeVSPResource = (overrides: any = {}): fhir4.Library => ({
  resourceType: 'Library',
  id: 'test-vsp-2026-01',
  status: 'draft',
  version: '2026-01',
  type: {
    coding: [{ system: 'http://terminology.hl7.org/CodeSystem/library-type', code: 'asset-collection' }]
  },
  useContext: [{
    code: { system: 'http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context-type', code: 'specification-type' },
    valueCodeableConcept: {
      coding: [{ system: 'http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context', code: 'value-set-package' }]
    }
  }],
  relatedArtifact: [{
    type: 'composed-of',
    resource: 'http://hl7.org/fhir/us/core/ImplementationGuide/hl7.fhir.us.core|6.1.0'
  }],
  ...overrides
})

describe('/api/value-set-packages/[id]', () => {
  describe('GET', () => {
    test('returns a VSP by ID', async () => {
      const vsp = makeVSPResource()
      FhirClient.getInstance().read = jest.fn().mockResolvedValue(vsp)

      const { req, res } = createMocks({
        method: 'GET',
        query: { id: 'test-vsp-2026-01' }
      })

      await handler(req, res)
      expect(res._getStatusCode()).toBe(200)

      const data = res._getData()
      expect(data.vsp.id).toBe('test-vsp-2026-01')
    })

    test('returns 400 when resource is not a VSP', async () => {
      const programLibrary = {
        resourceType: 'Library',
        id: 'program-123',
        status: 'draft',
        type: { coding: [{ code: 'asset-collection' }] },
        useContext: [{
          code: { code: 'specification-type' },
          valueCodeableConcept: { coding: [{ code: 'program' }] }
        }]
      }
      FhirClient.getInstance().read = jest.fn().mockResolvedValue(programLibrary)

      const { req, res } = createMocks({
        method: 'GET',
        query: { id: 'program-123' }
      })

      await handler(req, res)
      expect(res._getStatusCode()).toBe(400)
    })

    test('returns 400 when ID is missing', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {}
      })

      await handler(req, res)
      expect(res._getStatusCode()).toBe(400)
    })

    test('returns error status when FHIR read fails', async () => {
      FhirClient.getInstance().read = jest.fn().mockRejectedValue({
        response: { status: 404, data: { issue: [{ code: 'not-found', diagnostics: 'Not found' }] } }
      })

      const { req, res } = createMocks({
        method: 'GET',
        query: { id: 'nonexistent-vsp' }
      })

      await handler(req, res)
      expect(res._getStatusCode()).toBe(404)
    })
  })

  describe('PUT', () => {
    test('updates a draft VSP', async () => {
      const vsp = makeVSPResource()
      FhirClient.getInstance().update = jest.fn().mockResolvedValue(vsp)

      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: 'test-vsp-2026-01' },
        body: {
          ...vsp,
          id: 'test-vsp-2026-01',
          status: 'draft'
        }
      })

      await handler(req, res)
      expect(res._getStatusCode()).toBe(200)
      expect(FhirClient.getInstance().update).toHaveBeenCalledWith(
        expect.objectContaining({
          resourceType: 'Library',
          id: 'test-vsp-2026-01'
        })
      )
    })

    test('returns 409 when trying to edit an active VSP', async () => {
      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: 'test-vsp-2026-01' },
        body: {
          id: 'test-vsp-2026-01',
          status: 'active'
        }
      })

      await handler(req, res)
      expect(res._getStatusCode()).toBe(409)
    })

    test('returns 409 when trying to edit a retired VSP', async () => {
      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: 'test-vsp-2026-01' },
        body: {
          id: 'test-vsp-2026-01',
          status: 'retired'
        }
      })

      await handler(req, res)
      expect(res._getStatusCode()).toBe(409)
    })

    test('returns 400 for invalid vspVersion format', async () => {
      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: 'test-vsp-2026-01' },
        body: {
          id: 'test-vsp-2026-01',
          status: 'draft',
          version: '2026-13'
        }
      })

      await handler(req, res)
      expect(res._getStatusCode()).toBe(400)
    })

    test('returns 400 when igExperimental=true and experimental=false', async () => {
      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: 'test-vsp-2026-01', igExperimental: 'true' },
        body: {
          id: 'test-vsp-2026-01',
          status: 'draft',
          experimental: false
        }
      })

      await handler(req, res)
      expect(res._getStatusCode()).toBe(400)
    })

    test('returns 400 when body ID does not match query ID', async () => {
      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: 'test-vsp-2026-01' },
        body: {
          id: 'different-id',
          status: 'draft'
        }
      })

      await handler(req, res)
      expect(res._getStatusCode()).toBe(400)
    })

    test('returns 500 on FHIR update error', async () => {
      FhirClient.getInstance().update = jest.fn().mockRejectedValue({
        response: { status: 500 }
      })

      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: 'test-vsp-2026-01' },
        body: {
          id: 'test-vsp-2026-01',
          status: 'draft'
        }
      })

      await handler(req, res)
      expect(res._getStatusCode()).toBe(500)
    })
  })
})
