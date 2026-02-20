import { createMocks } from 'node-mocks-http'
import FhirClient from '@/backend/clients/FhirCdrClient'
import handler from '@/pages/api/value-set-packages/index'

jest.mock('next-auth', () => jest.fn())
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn().mockImplementation(() => ({
    user: { roles: ['admin'], email: 'superman@gotham.com' }
  }))
}))
jest.mock('fhir-kit-client')

const makeVSPResource = (overrides: any = {}) => ({
  resourceType: 'Library',
  id: 'test-vsp-2026-01',
  status: 'draft',
  type: { coding: [{ code: 'asset-collection' }] },
  useContext: [{
    code: { code: 'specification-type' },
    valueCodeableConcept: { coding: [{ code: 'value-set-package' }] }
  }],
  relatedArtifact: [{
    type: 'composed-of',
    resource: 'http://hl7.org/fhir/us/core/ImplementationGuide/hl7.fhir.us.core|6.1.0'
  }],
  ...overrides
})

describe('/api/value-set-packages', () => {
  test('GET returns VSPs', async () => {
    const { req, res } = createMocks({ method: 'GET' })

    FhirClient.getInstance().search = jest.fn().mockResolvedValue({
      resourceType: 'Bundle',
      type: 'searchset',
      total: 1,
      entry: [{ resource: makeVSPResource() }]
    })

    await handler(req, res)
    expect(res._getStatusCode()).toBe(200)

    const data = JSON.parse(res._getData())
    expect(data.vsps.length).toBe(1)
    expect(data.total).toBe(1)
  })

  test('GET returns empty array when no VSPs exist', async () => {
    const { req, res } = createMocks({ method: 'GET' })

    FhirClient.getInstance().search = jest.fn().mockResolvedValue({
      resourceType: 'Bundle',
      type: 'searchset',
      total: 0,
      entry: []
    })

    await handler(req, res)
    expect(res._getStatusCode()).toBe(200)

    const data = JSON.parse(res._getData())
    expect(data.vsps).toEqual([])
    expect(data.total).toBe(0)
  })

  test('GET filters out non-VSP libraries', async () => {
    const { req, res } = createMocks({ method: 'GET' })

    const programLibrary = {
      resourceType: 'Library',
      id: 'program-123',
      type: { coding: [{ code: 'asset-collection' }] },
      useContext: [{
        code: { code: 'specification-type' },
        valueCodeableConcept: { coding: [{ code: 'program' }] }
      }]
    }

    FhirClient.getInstance().search = jest.fn().mockResolvedValue({
      resourceType: 'Bundle',
      type: 'searchset',
      total: 2,
      entry: [
        { resource: makeVSPResource() },
        { resource: programLibrary }
      ]
    })

    await handler(req, res)
    expect(res._getStatusCode()).toBe(200)

    const data = JSON.parse(res._getData())
    expect(data.vsps.length).toBe(1)
    expect(data.vsps[0].id).toBe('test-vsp-2026-01')
  })

  test('GET applies IG filter', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { 'ig-url': 'http://hl7.org/fhir/us/core/ImplementationGuide/hl7.fhir.us.core|6.1.0' }
    })

    const vsp1 = makeVSPResource({ id: 'vsp-core' })
    const vsp2 = makeVSPResource({
      id: 'vsp-ecr',
      relatedArtifact: [{
        type: 'composed-of',
        resource: 'http://hl7.org/fhir/us/ecr/ImplementationGuide/hl7.fhir.us.ecr|2.1.0'
      }]
    })

    FhirClient.getInstance().search = jest.fn().mockResolvedValue({
      resourceType: 'Bundle',
      type: 'searchset',
      total: 2,
      entry: [{ resource: vsp1 }, { resource: vsp2 }]
    })

    await handler(req, res)
    expect(res._getStatusCode()).toBe(200)

    const data = JSON.parse(res._getData())
    expect(data.vsps.length).toBe(1)
    expect(data.vsps[0].id).toBe('vsp-core')
  })

  test('GET with showRetired=false excludes retired', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { showRetired: 'false' }
    })

    FhirClient.getInstance().search = jest.fn().mockResolvedValue({
      resourceType: 'Bundle',
      type: 'searchset',
      total: 0,
      entry: []
    })

    await handler(req, res)

    expect(FhirClient.getInstance().search).toHaveBeenCalledWith(
      expect.objectContaining({
        searchParams: expect.objectContaining({
          'status:not': 'retired'
        })
      })
    )
  })

  test('GET returns 500 on FHIR error', async () => {
    const { req, res } = createMocks({ method: 'GET' })

    FhirClient.getInstance().search = jest.fn().mockRejectedValue(new Error('FHIR server error'))

    await handler(req, res)
    expect(res._getStatusCode()).toBe(500)
  })
})
