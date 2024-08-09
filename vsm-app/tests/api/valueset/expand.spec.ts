import handler, { ExpandRequest } from 'pages/api/valueset/expand'
import { createMocks } from 'node-mocks-http'
import fetchMock from 'jest-fetch-mock'
import { vsacFhirClient, fhirCdrClient } from '@/fhirClients'
import { NextApiResponse } from 'next'

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
  beforeEach(() => {
    // if you have an existing `beforeEach` just add the following line to it
    fetchMock.enableMocks()
  })

  afterEach(() => {
    fetchMock.resetMocks()
  })

  test('should call vsac for $expand for expansion on valuesets', async () => {
    const body: ExpandRequest['body'] = {
      expansionParameters: {
        'http://loinc.org': ['2.69']
      },
      valueSetId: 'http://loinc.org/vs/LL269-2'
    }
    const { req, res } = createMocks<ExpandRequest, NextApiResponse>({
      method: 'POST',
      body: body
    })

    await handler(req, res)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toContain('ValueSet/http://loinc.org/vs/LL269-2/$expand')

    expect(fetchMock.mock.calls[0][1].body).toBe(
      JSON.stringify({ resourceType: 'Parameters', parameter: [{ name: 'system-version', valueCanonical: 'http://loinc.org|2.69' }] })
    )
  })

  test('should search on grouper valuesets', async () => {
    const body: ExpandRequest['body'] = {
      codeSystem: 'http://hl7.org/fhir/sid/icd-10-cm',
      groupersToSearch: ['2366'],
      codeToFind: 'A48.51',
      expansionParameters: {
        'http://terminology.hl7.org/CodeSystem/v3-ActCode': ['9.0.0'],
        'http://terminology.hl7.org/CodeSystem/v3-AddressUse': ['3.0.0']
      }
    }
    const { req, res } = createMocks<ExpandRequest, NextApiResponse>({
      method: 'POST',
      body: body
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
