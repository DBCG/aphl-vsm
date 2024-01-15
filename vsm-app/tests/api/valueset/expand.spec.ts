import handler from 'pages/api/valueset/expand'
import { createMocks } from 'node-mocks-http'
import { vsacFhirClient } from '@/fhirClients'

// Mock Auth for Setup
jest.mock('next-auth', () => jest.fn())
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn().mockImplementation(() => ({
    user: {
      roles: ['admin']
    }
  }))
}))

jest.mock('fhirClients')

describe('pages/api/valueset/expand', () => {
  test('should call vsac for $expand for expansion on valuesets', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        expansionParameters: {
          'http://loinc.org': ['2.69']
        },
        valueSetId: 'http://loinc.org/vs/LL269-2'
      }
    })

    const response = await handler(req, res)
    expect(vsacFhirClient.operation).toBeCalledTimes(1)
    expect(vsacFhirClient.operation).toBeCalledWith({
      name: '$expand',
      id: 'http://loinc.org/vs/LL269-2',
      resourceType: 'ValueSet',
      method: 'POST',
      input: '{"resourceType":"Parameters","parameter":[{"name":"system-version","valueCanonical":"http://loinc.org|2.69"}]}',
      options: {
        headers: {
          'content-type': 'application/json'
        }
      }
    })
  })
})
