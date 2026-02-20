import { createMocks } from 'node-mocks-http'
import FhirClient from '@/backend/clients/FhirCdrClient'
import releaseHandler from '@/pages/api/value-set-packages/[id]/release'
import withdrawHandler from '@/pages/api/value-set-packages/[id]/withdraw'
import retireHandler from '@/pages/api/value-set-packages/[id]/retire'
import deleteHandler from '@/pages/api/value-set-packages/[id]/delete'

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
  type: {
    coding: [{ system: 'http://terminology.hl7.org/CodeSystem/library-type', code: 'asset-collection' }]
  },
  useContext: [{
    code: { system: 'http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context-type', code: 'specification-type' },
    valueCodeableConcept: {
      coding: [{ system: 'http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context', code: 'value-set-package' }]
    }
  }],
  ...overrides
})

describe('VSP Lifecycle Operations', () => {
  describe('POST /api/value-set-packages/[id]/release', () => {
    test('releases a draft VSP (draft → active)', async () => {
      const vsp = makeVSPResource({ status: 'draft' })
      FhirClient.getInstance().read = jest.fn().mockResolvedValue(vsp)
      FhirClient.getInstance().update = jest.fn().mockResolvedValue({ ...vsp, status: 'active' })

      const { req, res } = createMocks({
        method: 'POST',
        query: { id: 'test-vsp-2026-01' }
      })

      await releaseHandler(req, res)
      expect(res._getStatusCode()).toBe(200)

      const data = res._getData()
      expect(data.message).toContain('released')

      // Verify status was set to active
      expect(FhirClient.getInstance().update).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({ status: 'active' })
        })
      )
    })

    test('returns 400 when trying to release an active VSP', async () => {
      const vsp = makeVSPResource({ status: 'active' })
      FhirClient.getInstance().read = jest.fn().mockResolvedValue(vsp)

      const { req, res } = createMocks({
        method: 'POST',
        query: { id: 'test-vsp-2026-01' }
      })

      await releaseHandler(req, res)
      expect(res._getStatusCode()).toBe(400)
    })

    test('returns 400 when trying to release a retired VSP', async () => {
      const vsp = makeVSPResource({ status: 'retired' })
      FhirClient.getInstance().read = jest.fn().mockResolvedValue(vsp)

      const { req, res } = createMocks({
        method: 'POST',
        query: { id: 'test-vsp-2026-01' }
      })

      await releaseHandler(req, res)
      expect(res._getStatusCode()).toBe(400)
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
        method: 'POST',
        query: { id: 'program-123' }
      })

      await releaseHandler(req, res)
      expect(res._getStatusCode()).toBe(400)
    })

    test('sets release date on the VSP', async () => {
      const vsp = makeVSPResource({ status: 'draft' })
      FhirClient.getInstance().read = jest.fn().mockResolvedValue(vsp)
      FhirClient.getInstance().update = jest.fn().mockResolvedValue({ ...vsp, status: 'active' })

      const { req, res } = createMocks({
        method: 'POST',
        query: { id: 'test-vsp-2026-01' }
      })

      await releaseHandler(req, res)

      expect(FhirClient.getInstance().update).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            date: expect.any(String)
          })
        })
      )
    })

    test('returns 500 on FHIR error', async () => {
      FhirClient.getInstance().read = jest.fn().mockRejectedValue(new Error('FHIR server down'))

      const { req, res } = createMocks({
        method: 'POST',
        query: { id: 'test-vsp-2026-01' }
      })

      await releaseHandler(req, res)
      expect(res._getStatusCode()).toBe(500)
    })
  })

  describe('POST /api/value-set-packages/[id]/withdraw', () => {
    test('withdraws a draft VSP (soft delete + expunge)', async () => {
      const vsp = makeVSPResource({ status: 'draft' })
      FhirClient.getInstance().read = jest.fn().mockResolvedValue(vsp)
      FhirClient.getInstance().delete = jest.fn().mockResolvedValue({})
      FhirClient.getInstance().operation = jest.fn().mockResolvedValue({})

      const { req, res } = createMocks({
        method: 'POST',
        query: { id: 'test-vsp-2026-01' }
      })

      await withdrawHandler(req, res)
      expect(res._getStatusCode()).toBe(200)

      const data = res._getData()
      expect(data.message).toContain('withdrawn')

      // Verify soft delete was called
      expect(FhirClient.getInstance().delete).toHaveBeenCalledWith({
        resourceType: 'Library',
        id: 'test-vsp-2026-01'
      })

      // Verify expunge was called
      expect(FhirClient.getInstance().operation).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '$expunge',
          resourceType: 'Library',
          id: 'test-vsp-2026-01'
        })
      )
    })

    test('succeeds even if expunge fails (soft delete only)', async () => {
      const vsp = makeVSPResource({ status: 'draft' })
      FhirClient.getInstance().read = jest.fn().mockResolvedValue(vsp)
      FhirClient.getInstance().delete = jest.fn().mockResolvedValue({})
      FhirClient.getInstance().operation = jest.fn().mockRejectedValue(new Error('Expunge not supported'))

      const { req, res } = createMocks({
        method: 'POST',
        query: { id: 'test-vsp-2026-01' }
      })

      await withdrawHandler(req, res)
      expect(res._getStatusCode()).toBe(200)
    })

    test('returns 400 when trying to withdraw an active VSP', async () => {
      const vsp = makeVSPResource({ status: 'active' })
      FhirClient.getInstance().read = jest.fn().mockResolvedValue(vsp)

      const { req, res } = createMocks({
        method: 'POST',
        query: { id: 'test-vsp-2026-01' }
      })

      await withdrawHandler(req, res)
      expect(res._getStatusCode()).toBe(400)
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
        method: 'POST',
        query: { id: 'program-123' }
      })

      await withdrawHandler(req, res)
      expect(res._getStatusCode()).toBe(400)
    })

    test('returns 500 on FHIR error', async () => {
      FhirClient.getInstance().read = jest.fn().mockRejectedValue(new Error('FHIR server down'))

      const { req, res } = createMocks({
        method: 'POST',
        query: { id: 'test-vsp-2026-01' }
      })

      await withdrawHandler(req, res)
      expect(res._getStatusCode()).toBe(500)
    })
  })

  describe('POST /api/value-set-packages/[id]/retire', () => {
    test('retires an active VSP (active → retired)', async () => {
      const vsp = makeVSPResource({ status: 'active' })
      FhirClient.getInstance().read = jest.fn().mockResolvedValue(vsp)
      FhirClient.getInstance().update = jest.fn().mockResolvedValue({ ...vsp, status: 'retired' })

      const { req, res } = createMocks({
        method: 'POST',
        query: { id: 'test-vsp-2026-01' }
      })

      await retireHandler(req, res)
      expect(res._getStatusCode()).toBe(200)

      const data = res._getData()
      expect(data.message).toContain('retired')

      expect(FhirClient.getInstance().update).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({ status: 'retired' })
        })
      )
    })

    test('returns 400 when trying to retire a draft VSP', async () => {
      const vsp = makeVSPResource({ status: 'draft' })
      FhirClient.getInstance().read = jest.fn().mockResolvedValue(vsp)

      const { req, res } = createMocks({
        method: 'POST',
        query: { id: 'test-vsp-2026-01' }
      })

      await retireHandler(req, res)
      expect(res._getStatusCode()).toBe(400)
    })

    test('returns 400 when trying to retire an already retired VSP', async () => {
      const vsp = makeVSPResource({ status: 'retired' })
      FhirClient.getInstance().read = jest.fn().mockResolvedValue(vsp)

      const { req, res } = createMocks({
        method: 'POST',
        query: { id: 'test-vsp-2026-01' }
      })

      await retireHandler(req, res)
      expect(res._getStatusCode()).toBe(400)
    })

    test('returns 400 when resource is not a VSP', async () => {
      const programLibrary = {
        resourceType: 'Library',
        id: 'program-123',
        status: 'active',
        type: { coding: [{ code: 'asset-collection' }] },
        useContext: [{
          code: { code: 'specification-type' },
          valueCodeableConcept: { coding: [{ code: 'program' }] }
        }]
      }
      FhirClient.getInstance().read = jest.fn().mockResolvedValue(programLibrary)

      const { req, res } = createMocks({
        method: 'POST',
        query: { id: 'program-123' }
      })

      await retireHandler(req, res)
      expect(res._getStatusCode()).toBe(400)
    })

    test('returns 500 on FHIR error', async () => {
      FhirClient.getInstance().read = jest.fn().mockRejectedValue(new Error('FHIR server down'))

      const { req, res } = createMocks({
        method: 'POST',
        query: { id: 'test-vsp-2026-01' }
      })

      await retireHandler(req, res)
      expect(res._getStatusCode()).toBe(500)
    })
  })

  describe('POST /api/value-set-packages/[id]/delete', () => {
    test('deletes a retired VSP', async () => {
      const vsp = makeVSPResource({ status: 'retired' })
      FhirClient.getInstance().read = jest.fn().mockResolvedValue(vsp)
      FhirClient.getInstance().delete = jest.fn().mockResolvedValue({})

      const { req, res } = createMocks({
        method: 'POST',
        query: { id: 'test-vsp-2026-01' }
      })

      await deleteHandler(req, res)
      expect(res._getStatusCode()).toBe(200)

      const data = res._getData()
      expect(data.message).toContain('deleted')

      expect(FhirClient.getInstance().delete).toHaveBeenCalledWith({
        resourceType: 'Library',
        id: 'test-vsp-2026-01'
      })
    })

    test('returns 400 when trying to delete a draft VSP', async () => {
      const vsp = makeVSPResource({ status: 'draft' })
      FhirClient.getInstance().read = jest.fn().mockResolvedValue(vsp)

      const { req, res } = createMocks({
        method: 'POST',
        query: { id: 'test-vsp-2026-01' }
      })

      await deleteHandler(req, res)
      expect(res._getStatusCode()).toBe(400)
    })

    test('returns 400 when trying to delete an active VSP', async () => {
      const vsp = makeVSPResource({ status: 'active' })
      FhirClient.getInstance().read = jest.fn().mockResolvedValue(vsp)

      const { req, res } = createMocks({
        method: 'POST',
        query: { id: 'test-vsp-2026-01' }
      })

      await deleteHandler(req, res)
      expect(res._getStatusCode()).toBe(400)
    })

    test('returns 400 when resource is not a VSP', async () => {
      const programLibrary = {
        resourceType: 'Library',
        id: 'program-123',
        status: 'retired',
        type: { coding: [{ code: 'asset-collection' }] },
        useContext: [{
          code: { code: 'specification-type' },
          valueCodeableConcept: { coding: [{ code: 'program' }] }
        }]
      }
      FhirClient.getInstance().read = jest.fn().mockResolvedValue(programLibrary)

      const { req, res } = createMocks({
        method: 'POST',
        query: { id: 'program-123' }
      })

      await deleteHandler(req, res)
      expect(res._getStatusCode()).toBe(400)
    })

    test('returns 500 on FHIR error', async () => {
      FhirClient.getInstance().read = jest.fn().mockRejectedValue(new Error('FHIR server down'))

      const { req, res } = createMocks({
        method: 'POST',
        query: { id: 'test-vsp-2026-01' }
      })

      await deleteHandler(req, res)
      expect(res._getStatusCode()).toBe(500)
    })
  })
})
