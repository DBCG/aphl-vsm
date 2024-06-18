import { createMocks } from 'node-mocks-http'
import { fhirCdrClient } from 'fhirClients'
import handler from '@/pages/api/template'
import { NextApiRequest, NextApiResponse } from 'next'

// Mock Auth for Setup
jest.mock('next-auth', () => jest.fn())
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn().mockImplementation(() => ({
    user: {
      roles: ['admin'],
      email: 'superman@gotham.com'
    }
  }))
}))
jest.mock('fhirClients')

describe('/api/template', () => {
  test('POST /api/template, successfully clones a program', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {
        latestProgramVersion: '1.0.0',
        libraryData: {
          resourceType: 'Library',
          id: '1234',
          version: '1.0.0'
        }
      }
    })

    fhirCdrClient.search = jest.fn().mockResolvedValueOnce({
      entry: [{
        resource: {
          resourceType: 'Library',
          id: '1234',
          version: '1.0.0'
        }
      }]
    })

    fhirCdrClient.operation = jest
      .fn()
      .mockResolvedValueOnce({
        resourceType: 'Bundle',
        type: 'transaction-response',
        entry: [
          {
            response: {
              status: '201 Created',
              location: 'Library/55/_history/1',
              etag: '1',
              lastModified: '2024-04-11T21:23:37.848+00:00',
              outcome: {
                resourceType: 'OperationOutcome',
                issue: [
                  {
                    severity: 'information',
                    code: 'informational',
                    details: {
                      coding: [
                        {
                          system: 'https://hapifhir.io/fhir/CodeSystem/hapi-fhir-storage-response-code',
                          code: 'SUCCESSFUL_CREATE',
                          display: 'Create succeeded.'
                        }
                      ]
                    },
                    diagnostics: 'Successfully created resource "Library/55/_history/1". Took 7ms.'
                  }
                ]
              }
            }
          },
          {
            response: {
              status: '201 Created',
              location: 'PlanDefinition/56/_history/1',
              etag: '1',
              lastModified: '2024-04-11T21:23:37.848+00:00',
              outcome: {
                resourceType: 'OperationOutcome',
                issue: [
                  {
                    severity: 'information',
                    code: 'informational',
                    details: {
                      coding: [
                        {
                          system: 'https://hapifhir.io/fhir/CodeSystem/hapi-fhir-storage-response-code',
                          code: 'SUCCESSFUL_CREATE',
                          display: 'Create succeeded.'
                        }
                      ]
                    },
                    diagnostics: 'Successfully created resource "PlanDefinition/56/_history/1". Took 3ms.'
                  }
                ]
              }
            }
          },
          {
            response: {
              status: '201 Created',
              location: 'Library/57/_history/1',
              etag: '1',
              lastModified: '2024-04-11T21:23:37.848+00:00',
              outcome: {
                resourceType: 'OperationOutcome',
                issue: [
                  {
                    severity: 'information',
                    code: 'informational',
                    details: {
                      coding: [
                        {
                          system: 'https://hapifhir.io/fhir/CodeSystem/hapi-fhir-storage-response-code',
                          code: 'SUCCESSFUL_CREATE',
                          display: 'Create succeeded.'
                        }
                      ]
                    },
                    diagnostics: 'Successfully created resource "Library/57/_history/1". Took 2ms.'
                  }
                ]
              }
            }
          },
          {
            response: {
              status: '201 Created',
              location: 'ValueSet/58/_history/1',
              etag: '1',
              lastModified: '2024-04-11T21:23:37.848+00:00',
              outcome: {
                resourceType: 'OperationOutcome',
                issue: [
                  {
                    severity: 'information',
                    code: 'informational',
                    details: {
                      coding: [
                        {
                          system: 'https://hapifhir.io/fhir/CodeSystem/hapi-fhir-storage-response-code',
                          code: 'SUCCESSFUL_CREATE',
                          display: 'Create succeeded.'
                        }
                      ]
                    },
                    diagnostics: 'Successfully created resource "ValueSet/58/_history/1". Took 6ms.'
                  }
                ]
              }
            }
          },
          {
            response: {
              status: '201 Created',
              location: 'ValueSet/59/_history/1',
              etag: '1',
              lastModified: '2024-04-11T21:23:37.848+00:00',
              outcome: {
                resourceType: 'OperationOutcome',
                issue: [
                  {
                    severity: 'information',
                    code: 'informational',
                    details: {
                      coding: [
                        {
                          system: 'https://hapifhir.io/fhir/CodeSystem/hapi-fhir-storage-response-code',
                          code: 'SUCCESSFUL_CREATE',
                          display: 'Create succeeded.'
                        }
                      ]
                    },
                    diagnostics: 'Successfully created resource "ValueSet/59/_history/1". Took 7ms.'
                  }
                ]
              }
            }
          },
          {
            response: {
              status: '201 Created',
              location: 'ValueSet/60/_history/1',
              etag: '1',
              lastModified: '2024-04-11T21:23:37.848+00:00',
              outcome: {
                resourceType: 'OperationOutcome',
                issue: [
                  {
                    severity: 'information',
                    code: 'informational',
                    details: {
                      coding: [
                        {
                          system: 'https://hapifhir.io/fhir/CodeSystem/hapi-fhir-storage-response-code',
                          code: 'SUCCESSFUL_CREATE',
                          display: 'Create succeeded.'
                        }
                      ]
                    },
                    diagnostics: 'Successfully created resource "ValueSet/60/_history/1". Took 3ms.'
                  }
                ]
              }
            }
          },
          {
            response: {
              status: '201 Created',
              location: 'ValueSet/61/_history/1',
              etag: '1',
              lastModified: '2024-04-11T21:23:37.848+00:00',
              outcome: {
                resourceType: 'OperationOutcome',
                issue: [
                  {
                    severity: 'information',
                    code: 'informational',
                    details: {
                      coding: [
                        {
                          system: 'https://hapifhir.io/fhir/CodeSystem/hapi-fhir-storage-response-code',
                          code: 'SUCCESSFUL_CREATE',
                          display: 'Create succeeded.'
                        }
                      ]
                    },
                    diagnostics: 'Successfully created resource "ValueSet/61/_history/1". Took 6ms.'
                  }
                ]
              }
            }
          },
          {
            response: {
              status: '201 Created',
              location: 'ValueSet/62/_history/1',
              etag: '1',
              lastModified: '2024-04-11T21:23:37.848+00:00',
              outcome: {
                resourceType: 'OperationOutcome',
                issue: [
                  {
                    severity: 'information',
                    code: 'informational',
                    details: {
                      coding: [
                        {
                          system: 'https://hapifhir.io/fhir/CodeSystem/hapi-fhir-storage-response-code',
                          code: 'SUCCESSFUL_CREATE',
                          display: 'Create succeeded.'
                        }
                      ]
                    },
                    diagnostics: 'Successfully created resource "ValueSet/62/_history/1". Took 4ms.'
                  }
                ]
              }
            }
          },
          {
            response: {
              status: '201 Created',
              location: 'ValueSet/63/_history/1',
              etag: '1',
              lastModified: '2024-04-11T21:23:37.848+00:00',
              outcome: {
                resourceType: 'OperationOutcome',
                issue: [
                  {
                    severity: 'information',
                    code: 'informational',
                    details: {
                      coding: [
                        {
                          system: 'https://hapifhir.io/fhir/CodeSystem/hapi-fhir-storage-response-code',
                          code: 'SUCCESSFUL_CREATE',
                          display: 'Create succeeded.'
                        }
                      ]
                    },
                    diagnostics: 'Successfully created resource "ValueSet/63/_history/1". Took 3ms.'
                  }
                ]
              }
            }
          }
        ]
      })

    await handler(req, res)
    expect(res._getStatusCode()).toBe(200)
    expect(res._getData()).toEqual("{\"message\":\"Successfully drafted\"}")
  })
})
