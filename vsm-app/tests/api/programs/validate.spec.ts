import { createMocks } from 'node-mocks-http'
import { fhirCdrClient } from 'fhirClients'
import handler from '@/pages/api/programs/validate'

const testValidationPackage = {
  resourceType: 'Bundle',
  type: 'transaction',
  entry: [
    {
      fullUrl: 'http://test-full-url',
      resource: {
        resourceType: 'ValueSet',
        id: '123'
      },
      request: {
        method: 'POST',
        url: 'ValueSet/123'
      }
    }
  ]
} as fhir4.Bundle

const parameterizedValidationPackage = {
  resourceType: 'Parameters',
  parameter: [
    {
      name: 'resource',
      resource: testValidationPackage
    }
  ]
}

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

describe('/api/programs/validate', () => {

  test('should call cqf $validate', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        pkg: testValidationPackage
      }
    })

    await handler(req, res)
    expect(fhirCdrClient.operation).toHaveBeenCalledTimes(1)
    expect(fhirCdrClient.operation).toHaveBeenCalledWith({
      name: '$validate',
      method: 'POST',
      input: JSON.stringify(parameterizedValidationPackage),
      options: {
        headers: {
          'Content-Type': `application/fhir+json`
        }
      }
    })
  })
})