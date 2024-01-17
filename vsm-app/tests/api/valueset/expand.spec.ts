import handler from 'pages/api/valueset/expand'
import { createMocks } from 'node-mocks-http'
import { vsacFhirClient, fhirCdrClient } from '@/fhirClients'

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

    await handler(req, res)
    expect(vsacFhirClient.operation).toHaveBeenCalledTimes(1)
    expect(vsacFhirClient.operation).toHaveBeenCalledWith({
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

  test('should search on grouper valuesets', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        codeSystem: 'http://hl7.org/fhir/sid/icd-10-cm',
        groupersToSearch: ['2366'],
        codeToFind: 'A48.51',
        expansionParameters: {
          'http://terminology.hl7.org/CodeSystem/v3-ActCode': ['9.0.0'],
          'http://terminology.hl7.org/CodeSystem/v3-AddressUse': ['3.0.0']
        }
      }
    })
    fhirCdrClient.batch = jest.fn().mockResolvedValue({
      resourceType: 'Bundle',
      type: 'batch',
      entry: [
        {
          fullUrl: 'test',
          resource: {
            resourceType: 'ValueSet',
            id: '2366',
            url: 'http://cts.nlm.nih.gov/fhir/ValueSet/2366',
            version: '1',
            name: 'ICD10CM',
            title: 'ICD-10-CM',
            status: 'active'
          }
        }
      ]
    })
    await handler(req, res)

    expect(fhirCdrClient.batch).toHaveBeenCalledWith({
      body: {
        resourceType: 'Bundle',
        type: 'batch',
        entry: [
          {
            request: {
              method: 'GET',
              resourceType: 'ValueSet',
              url: 'ValueSet?_id=2366&_elements=id'
            }
          }
        ]
      }
    })
  })
})
