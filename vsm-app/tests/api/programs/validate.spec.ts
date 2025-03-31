import { createMocks } from 'node-mocks-http'
import FhirClient from '@/backend/clients/FhirCdrClient'
import handler, { ValidateBody, ValidateErrorResponse } from '@/pages/api/programs/validate'
import { NextApiResponse } from 'next'

const testValidationPackage: fhir4.Bundle = {
  resourceType: 'Bundle',
  type: 'transaction',
  entry: [
    {
      fullUrl: 'http://test-full-url',
      resource: {
        resourceType: 'ValueSet',
        id: '123',
        status: "active"
      },
      request: {
        method: 'POST',
        url: 'ValueSet/123'
      }
    }
  ]
}

const parameterizedValidationPackage: fhir4.Parameters = {
  resourceType: 'Parameters',
  parameter: [
    {
      name: 'resource',
      resource: testValidationPackage
    }
  ]
}

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
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ test: 100 }),
  }),
) as jest.Mock;

describe('/api/programs/validate', () => {

  test('should call cqf $validate', async () => {
    const { req, res } = createMocks<ValidateBody, NextApiResponse<ValidateErrorResponse>>({
      method: 'POST',
      body: {
        pkg: testValidationPackage
      }
    })
    const testBaseURl = 'www.test.com/fhir'
    FhirClient.getInstance().baseUrl = testBaseURl
    await handler(req, res)
    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(global.fetch).toHaveBeenCalledWith(testBaseURl + "/$validate", {
      method: 'POST',
      body: JSON.stringify(parameterizedValidationPackage),
      headers: {
        'Content-Type': `application/fhir+json`
      }
    })
  })
})