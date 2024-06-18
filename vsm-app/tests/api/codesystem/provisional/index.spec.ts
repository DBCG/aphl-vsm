import { createMocks } from 'node-mocks-http'
import { fhirCdrClient } from 'fhirClients'
import handler from '@/pages/api/codesystem/provisional'

jest.mock('fhirClients')

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

  test('returns all the programs', async () => {
    const { req, res } = createMocks({ method: 'GET' })

    fhirCdrClient.search = jest.fn().mockImplementation(() => ({
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

    const response = await handler(req, res)
    console.log('data: ', response._getData())
    expect(response.statusCode).toBe(200)
    expect(response._getData()).toHaveLength(1)
  })
})
