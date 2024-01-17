import { createMocks } from 'node-mocks-http'
import { fhirCdrClient } from 'fhirClients'
import handler from '@/pages/api/programs/index'

jest.mock('fhirClients')

describe('/api/programs', () => {

  test('returns all the progrmas', async () => {
    const { req, res } = createMocks({ method: 'GET' })

    fhirCdrClient.search = jest.fn().mockImplementation(() => ({
      resourceType: 'Bundle',
      type: 'searchset',
      entry: [
        {
          resource: {
            resourceType: 'Library',
            id: '123',
            name: 'test',
            description: 'test',
            title: 'test',
            version: '1.0.0',
            status: 'draft',
            type: {
              coding: [
                {
                  code: 'logic-library'
                }
              ]
            }
          }
        }
      ]
    }))

    const response = await handler(req, res)
    expect(response.statusCode).toBe(200)
    expect(response._getData().programs.length).toBe(1)
  })
})
