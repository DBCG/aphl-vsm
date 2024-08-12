import handler, { ExpandRequest } from 'pages/api/valueset/[id]/expand'
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

describe('pages/api/valueset/[id]/expand', () => {
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
      valueSetId: '4224'
    }
    const { req, res } = createMocks<ExpandRequest, NextApiResponse>({
      method: 'POST',
      body: body
    })
    fhirCdrClient.read = jest.fn().mockResolvedValue({
      resourceType: 'ValueSet',
      id: '4224',
      url: 'http://cts.nlm.nih.gov/fhir/ValueSet/2.32.33.44.22.55',
      version: '07012018',
      name: 'LL269-2',
      title: 'LL269-2',
      status: 'active',
      compose: {
        include: [
          {
            system: 'http://loinc.org'
          }
        ]
      }
    })
    await handler(req, res)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    console.log(fetchMock.mock.calls[0][0])
    expect(fetchMock.mock.calls[0][0]).toContain('ValueSet/2.32.33.44.22.55/$expand')

    expect(fetchMock.mock.calls[0][1].body).toBe(
      JSON.stringify({
        resourceType: 'Parameters',
        parameter: [
          { name: 'system-version', valueCanonical: 'http://loinc.org|2.69' },
          { name: 'valueSetVersion', valueString: '07012018' }
        ]
      })
    )
  })

  test('should not include system-version for codesystem not present in valueset', async () => {
    const body: ExpandRequest['body'] = {
      expansionParameters: {
        'http://snomed.info/sct': ['http://snomed.info/sct/731000124108/version/20240301']
      },
      valueSetId: '4224'
    }
    const { req, res } = createMocks<ExpandRequest, NextApiResponse>({
      method: 'POST',
      body: body
    })
    fhirCdrClient.read = jest.fn().mockResolvedValue({
      resourceType: 'ValueSet',
      id: '4224',
      url: 'http://cts.nlm.nih.gov/fhir/ValueSet/2.32.33.44.22.55',
      version: '07012018',
      name: 'LL269-2',
      title: 'LL269-2',
      status: 'active',
      compose: {
        include: [
          {
            system: 'http://loinc.org'
          }
        ]
      }
    })
    await handler(req, res)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    console.log(fetchMock.mock.calls[0][0])
    expect(fetchMock.mock.calls[0][0]).toContain('ValueSet/2.32.33.44.22.55/$expand')

    expect(fetchMock.mock.calls[0][1].body).toBe(
      JSON.stringify({
        resourceType: 'Parameters',
        parameter: [
          { name: 'valueSetVersion', valueString: '07012018' }
        ]
      })
    )
  })


  // TODO: Needs to be moved to new api endpoint /api/valueset/codesearch
  // test('should search on grouper valuesets', async () => {
  //   const body: ExpandRequest['body'] = {
  //     codeSystem: 'http://hl7.org/fhir/sid/icd-10-cm',
  //     groupersToSearch: ['2366'],
  //     codeToFind: 'A48.51',
  //     expansionParameters: {
  //       'http://terminology.hl7.org/CodeSystem/v3-ActCode': ['9.0.0'],
  //       'http://terminology.hl7.org/CodeSystem/v3-AddressUse': ['3.0.0']
  //     }
  //   }
  //   const { req, res } = createMocks<ExpandRequest, NextApiResponse>({
  //     method: 'POST',
  //     body: body
  //   })
  //   fhirCdrClient.batch = jest.fn().mockResolvedValue({
  //     resourceType: 'Bundle',
  //     type: 'batch',
  //     entry: [
  //       {
  //         fullUrl: 'test',
  //         resource: {
  //           resourceType: 'ValueSet',
  //           id: '2366',
  //           url: 'http://cts.nlm.nih.gov/fhir/ValueSet/2366',
  //           version: '1',
  //           name: 'ICD10CM',
  //           title: 'ICD-10-CM',
  //           status: 'active'
  //         }
  //       }
  //     ]
  //   })
  //   await handler(req, res)

  //   expect(fhirCdrClient.batch).toHaveBeenCalledWith({
  //     body: {
  //       resourceType: 'Bundle',
  //       type: 'batch',
  //       entry: [
  //         {
  //           request: {
  //             method: 'GET',
  //             resourceType: 'ValueSet',
  //             url: 'ValueSet?_id=2366&_elements=id'
  //           }
  //         }
  //       ]
  //     }
  //   })
  // })
})
