import { createMocks } from 'node-mocks-http'
import FhirClient from '@/backend/clients/FhirCdrClient'
import handler from '@/pages/api/value-set-packages/create'

jest.mock('next-auth', () => jest.fn())
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn().mockImplementation(() => ({
    user: { roles: ['admin'], email: 'superman@gotham.com' }
  }))
}))
jest.mock('fhir-kit-client')

const validBody = {
  igCanonical: 'http://hl7.org/fhir/us/core/ImplementationGuide/hl7.fhir.us.core|6.1.0',
  igPackageId: 'hl7.fhir.us.core',
  igName: 'USCore',
  igTitle: 'US Core',
  vspVersion: '2026-01'
}

describe('/api/value-set-packages/create', () => {
  beforeEach(() => {
    // Default: VSP doesn't exist yet (404 on read)
    FhirClient.getInstance().read = jest.fn().mockRejectedValue({
      response: { status: 404 }
    })
    FhirClient.getInstance().update = jest.fn().mockResolvedValue({
      resourceType: 'Library',
      id: 'hl7.fhir.us.core.6.1.0-2026-01'
    })
  })

  test('POST creates a VSP successfully', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: validBody
    })

    await handler(req, res)
    expect(res._getStatusCode()).toBe(201)

    const data = JSON.parse(res._getData())
    expect(data.vspId).toBe('hl7.fhir.us.core.6.1.0-2026-01')
    expect(data.message).toContain('successfully')
  })

  test('POST calls FHIR update with correct Library structure', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: validBody
    })

    await handler(req, res)

    expect(FhirClient.getInstance().update).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceType: 'Library',
        id: 'hl7.fhir.us.core.6.1.0-2026-01',
        body: expect.objectContaining({
          resourceType: 'Library',
          status: 'draft',
          version: '2026-01',
          name: 'USCore610ValueSetPackageDefinition',
          title: 'US Core 6.1.0 Value Set Package Definition',
          useContext: expect.arrayContaining([
            expect.objectContaining({
              valueCodeableConcept: expect.objectContaining({
                coding: [expect.objectContaining({ code: 'value-set-package' })]
              })
            })
          ]),
          relatedArtifact: expect.arrayContaining([
            expect.objectContaining({
              type: 'composed-of',
              resource: validBody.igCanonical
            })
          ])
        })
      })
    )
  })

  test('POST returns 400 when igCanonical is missing', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { ...validBody, igCanonical: '' }
    })

    await handler(req, res)
    expect(res._getStatusCode()).toBe(400)
  })

  test('POST returns 400 when vspVersion is missing', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { ...validBody, vspVersion: '' }
    })

    await handler(req, res)
    expect(res._getStatusCode()).toBe(400)
  })

  test('POST returns 400 when igPackageId is missing', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { ...validBody, igPackageId: '' }
    })

    await handler(req, res)
    expect(res._getStatusCode()).toBe(400)
  })

  test('POST returns 400 for invalid vspVersion format', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { ...validBody, vspVersion: '2026-13' }
    })

    await handler(req, res)
    expect(res._getStatusCode()).toBe(400)
  })

  test('POST returns 400 when IG canonical has no version', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { ...validBody, igCanonical: 'http://hl7.org/fhir/us/core/ImplementationGuide/hl7.fhir.us.core' }
    })

    await handler(req, res)
    expect(res._getStatusCode()).toBe(400)
  })

  test('POST returns 409 when VSP already exists', async () => {
    // Read succeeds = VSP already exists
    FhirClient.getInstance().read = jest.fn().mockResolvedValue({
      resourceType: 'Library',
      id: 'hl7.fhir.us.core.6.1.0-2026-01'
    })

    const { req, res } = createMocks({
      method: 'POST',
      body: validBody
    })

    await handler(req, res)
    expect(res._getStatusCode()).toBe(409)
  })
})
