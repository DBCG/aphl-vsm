import { createMocks } from 'node-mocks-http'
import FhirClient from '@/backend/clients/FhirClient'
import handler from '@/pages/api/programs/[id]/details/valuesets/groups'

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
jest.mock('fhir-kit-client')

describe('/api/programs/[id]/details/valuesets/groups', () => {
  it('GET /api/programs/[id]/details/valuesets/groups, should call retrieveGroupSets', async () => {
    // This test is sufficient as it uses getLibraryAndGrouper which is tested elsewhere
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        id: '123'
      }
    })

    await handler(req, res)
    expect(FhirClient.getInstance().read).toHaveBeenCalledTimes(1)
    expect(FhirClient.getInstance().read).toHaveBeenCalledWith({ resourceType: 'Library', id: '123' })
  })

  it('GET /api/programs/[id]/details/valuesets/groups, should throw an error', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        id: '123'
      }
    })
    FhirClient.getInstance().read = jest.fn().mockRejectedValueOnce(new Error('Test Error'))
    
    await handler(req, res)
    expect(res._getStatusCode()).toBe(400)
  })

  // WIP
  // it('PUT /api/programs/[id]/details/valuesets/groups, should updateGroupSets', async () => {
  //   const { req, res } = createMocks({
  //     method: 'GET',
  //     query: {
  //       id: '123'
  //     },
  //     body: {
  //       groupInfo: {
  //         label: 'test',
  //         value: 'test'
  //       }
  //     }
  //   })

  //   const programLibrary = {
  //     status: 'active',
  //     relatedArtifact: [
  //       {
  //         type: 'composed-of',
  //         resource: 'http://example.com/Library/123|1.0.0'
  //       }
  //     ]
  //   }
  //   const grouperLibrarySearchBundle = {
  //     entry: [
  //       {
  //         resource: {
  //           id: 'rctc',
  //           relatedArtifact: [
  //             {
  //               type: 'composed-of',
  //               resource: 'http://example.com/ValueSet/123|1.0.0'
  //             }
  //           ]
  //         }
  //       }
  //     ]
  //   }

  //   FhirClient.getInstance().read = jest.fn().mockResolvedValue(programLibrary)
  //   FhirClient.getInstance().search = jest
  //     .fn()
  //     .mockResolvedValueOnce(grouperLibrarySearchBundle)
  //     .mockResolvedValueOnce({
  //       entry: [
  //         {
  //           resource: {
  //             id: '123',
  //             url: 'http://example.com/ValueSet/123',
  //             version: '1.0.0'
  //           }
  //         }
  //       ]
  //     })

  //     await handler(req, res)
  //     expect(FhirClient.getInstance().read).toHaveBeenCalledTimes(1)
  //     expect(FhirClient.getInstance().read).toHaveBeenCalledWith({ resourceType: 'Library', id: '123' })
  //     expect(res._getStatusCode()).toBe(200)
  // })
})