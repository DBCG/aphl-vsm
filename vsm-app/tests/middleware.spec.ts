import { createMocks } from 'node-mocks-http'
import middleware from '../middleware'

jest.mock('next-auth/middleware', () => {
  const original = jest.requireActual('next-auth/middleware') // Step 2.
  return {
    ...original,
    withAuth: jest.fn((fn) => fn)
  }
})

describe('middleware', () => {
  it('should add application/json headers if POST,PUT,DELETE methods', async () => {
    const methods = ['POST', 'PUT', 'DELETE']

    const testCases = await Promise.allSettled(
      methods.map(async (method) => {
        const { req, res } = createMocks({
          method: method as any,
          header: new Headers()
        })
        req.nextUrl = new URL('http://localhost:3000/programs')
        const response = await middleware(req, res)
        expect(response?.headers.get('x-middleware-request-content-type')).toBe('application/json')
        expect(response?.headers.get('x-middleware-override-headers')).toBe('content-type')
        expect(response?.status).toBe(200)
      })
    )
    testCases.forEach((testCase) => {
      expect(testCase.status).toBe('fulfilled')
    })
  })

  it('should not add application/json headers for other methods', async () => {
    const methods = ['GET', 'HEAD', 'OPTION']

    const testCases = await Promise.allSettled(
      methods.map(async (method) => {
        const { req, res } = createMocks({
          method: method as any,
          header: new Headers()
        })
        req.nextUrl = new URL('http://localhost:3000/programs')
        const response = await middleware(req, res)
        
        expect(response?.headers.get('x-middleware-request-content-type')).toBeNull()
        expect(response?.headers.get('x-middleware-override-headers')).toBeNull()
        expect(response?.status).toBe(200)
      })
    )

    testCases.forEach((testCase) => {
      expect(testCase.status).toBe('fulfilled')
    })
  })
})
