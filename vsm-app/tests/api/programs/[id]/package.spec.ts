import { createMocks } from 'node-mocks-http'
import handler from '@/pages/api/programs/[id]/package'
import fetchMock from 'jest-fetch-mock'
import v2ExportResponse from '@/test_fixtures/ersd-export-v2.json'
import v1ExportResponse from '@/test_fixtures/ersd-export-v1.json'
import { cloneDeep } from 'lodash'
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

describe('/api/programs/[id]/package', () => {
  beforeEach(() => {
    // if you have an existing `beforeEach` just add the following line to it
    fetchMock.enableMocks()
  })

  afterEach(() => {
    fetchMock.resetMocks()
  })

  test('POST /api/programs/[id]/package, packages collection v2 bundle for download', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        parameters: {
          resourceType: 'Parameters'
        },
        data: {
          json: true,
          useV2: true
        }
      },
      query: {
        id: 'SpecificationLibrary'
      }
    })

    fetchMock.mockResponseOnce(JSON.stringify(v2ExportResponse))

    await handler(req, res)
    expect(res._getStatusCode()).toBe(200)
    expect(res._getData()).toEqual(v2ExportResponse)
  })

  test('POST /api/programs/[id]/package, packages collection v1 bundle for download', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        parameters: {
          resourceType: 'Parameters'
        },
        targetVersion: '4.0.0',
        data: {
          json: true,
          useV2: false
        }
      },
      query: {
        id: 'SpecificationLibrary'
      }
    })

    // v2 export response
    fetchMock.mockResponses([JSON.stringify(v2ExportResponse), { status: 200 }], [JSON.stringify(v1ExportResponse), { status: 200 }])
    // v1 export response

    await handler(req, res)
    expect(fetchMock.mock.calls[0][0]).toContain('/fhir/Library/SpecificationLibrary/$package?_format=json')
    expect(fetchMock.mock.calls[1][0]).toContain('/fhir/$ersd-v2-to-v1-transform?_format=json')
    expect(fetchMock.mock.calls.length).toEqual(2)

    const inputPayload = JSON.parse(fetchMock.mock.calls[1][1].body)
    expect(inputPayload.parameter[1].name).toEqual('targetVersion')
    expect(inputPayload.parameter[1].valueString).toEqual('4.0.0')

    expect(res._getStatusCode()).toBe(200)
    expect(res._getData()).toEqual(v1ExportResponse)
  })

  test('POST /api/programs/[id]/package, packages collection v1 bundle for download with provided planDefintion', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        parameters: {
          resourceType: 'Parameters'
        },
        targetVersion: '4.0.0',
        planDefinition: {
          resourceType: 'PlanDefinition',
          id: 'superspecial',
          url: 'http://example.com/PlanDefinition/123'
        },
        data: {
          json: true,
          useV2: false
        }
      },
      query: {
        id: 'SpecificationLibrary'
      }
    })

    // v2 export response
    fetchMock.mockResponses([JSON.stringify(v2ExportResponse), { status: 200 }], [JSON.stringify(v1ExportResponse), { status: 200 }])
    // v1 export response

    await handler(req, res)

    const inputPayload = JSON.parse(fetchMock.mock.calls[1][1].body)
    const replacedPlanDef = inputPayload.parameter[0].resource.entry.find((e: any) => e.resource.resourceType === 'PlanDefinition')

    expect(replacedPlanDef.resource.id).toEqual('superspecial')
    expect(res._getStatusCode()).toBe(200)
  })

  test('POST /api/programs/[id]/package, packages collection v1 error for missing planDefinition from v2 and not provided', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        parameters: {
          resourceType: 'Parameters'
        },
        targetVersion: '4.0.0',
        data: {
          json: true,
          useV2: false
        }
      },
      query: {
        id: 'SpecificationLibrary'
      }
    })

    const v2ExportResponseMissingPlanDef = cloneDeep(v2ExportResponse)
    v2ExportResponseMissingPlanDef.entry = v2ExportResponseMissingPlanDef.entry.filter(
      (e: any) => e.resource.resourceType !== 'PlanDefinition'
    )

    // v2 export response
    fetchMock.mockResponseOnce(JSON.stringify(v2ExportResponseMissingPlanDef))

    await handler(req, res)
    expect(res._getStatusCode()).toBe(400)
    expect(res._getData()).toBe(
      '{"error":"No PlanDefinition resource found in v2 package response nor was uploaded as part of the request"}'
    )
  })
})
