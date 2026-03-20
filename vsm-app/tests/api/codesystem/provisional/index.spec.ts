import { createMocks } from 'node-mocks-http'
import FhirClient from '@/backend/clients/FhirCdrClient'
import handler from '@/pages/api/codesystem/provisional'

jest.mock('fhir-kit-client')

// Mock Auth for Setup
jest.mock('next-auth', () => jest.fn())
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn().mockImplementation(() => ({
    user: {
      roles: ['admin']
    }
  }))
}))

describe('/api/codesystem/provisional', () => {

  test('returns all the provisional codesystems', async () => {
    const { req, res } = createMocks({ method: 'GET' })

    FhirClient.getInstance().search = jest.fn().mockImplementation(() => ({
      resourceType: 'Bundle',
      type: 'searchset',
      entry: [
        {
          resource: {
            resourceType: 'CodeSystem',
            meta: {
              versionId: 1,
              lastUpdated: '2024-05-09T16:56:38.228+00:00',
              source: '2345678j5',
              tag: [
                {
                  system: 'http://aphl.org/fhir/vsm/CodeSystem/vsm-workflow-codes',
                  code: 'vsm-authored'
                },
                {
                  system: 'http://aphl.org/fhir/vsm/CodeSystem/vsm-workflow-codes',
                  code: 'vsm-provisional'
                }
              ]
            },
            id: '123',
            version: 'PROVISIONAL',
            status: 'draft',
            experimental: true,
            content: 'complete',
          }
        }
      ]
    }))

    await handler(req, res)
    const parsed = JSON.parse(res._getData())
    expect(res._getStatusCode()).toBe(200)
    expect(parsed).toHaveLength(1)
  })
})
