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
        req.nextauth = { token: null }
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
        req.nextauth = { token: null }
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

  describe('role-based redirects', () => {
    it('should redirect non-admin (no roles) away from /settings/create-endpoint', async () => {
      const { req, res } = createMocks({ method: 'GET', header: new Headers() })
      req.nextUrl = new URL('http://localhost:3000/settings/create-endpoint')
      req.url = 'http://localhost:3000/settings/create-endpoint'
      req.nextauth = { token: { roles: [] } }
      const response = await middleware(req, res)
      expect(response?.status).toBe(307)
      expect(response?.headers.get('location')).toBe('http://localhost:3000/programs')
    })

    it('should redirect publisher away from /settings/create-endpoint', async () => {
      const { req, res } = createMocks({ method: 'GET', header: new Headers() })
      req.nextUrl = new URL('http://localhost:3000/settings/create-endpoint')
      req.url = 'http://localhost:3000/settings/create-endpoint'
      req.nextauth = { token: { roles: ['publisher'] } }
      const response = await middleware(req, res)
      expect(response?.status).toBe(307)
      expect(response?.headers.get('location')).toBe('http://localhost:3000/programs')
    })

    it('should redirect non-admin (no roles) away from /settings/edit-endpoint/abc', async () => {
      const { req, res } = createMocks({ method: 'GET', header: new Headers() })
      req.nextUrl = new URL('http://localhost:3000/settings/edit-endpoint/abc')
      req.url = 'http://localhost:3000/settings/edit-endpoint/abc'
      req.nextauth = { token: { roles: [] } }
      const response = await middleware(req, res)
      expect(response?.status).toBe(307)
      expect(response?.headers.get('location')).toBe('http://localhost:3000/programs')
    })

    it('should redirect when token is null on /settings/create-endpoint', async () => {
      const { req, res } = createMocks({ method: 'GET', header: new Headers() })
      req.nextUrl = new URL('http://localhost:3000/settings/create-endpoint')
      req.url = 'http://localhost:3000/settings/create-endpoint'
      req.nextauth = { token: null }
      const response = await middleware(req, res)
      expect(response?.status).toBe(307)
      expect(response?.headers.get('location')).toBe('http://localhost:3000/programs')
    })

    it('should not redirect admin on /settings/create-endpoint', async () => {
      const { req, res } = createMocks({ method: 'GET', header: new Headers() })
      req.nextUrl = new URL('http://localhost:3000/settings/create-endpoint')
      req.url = 'http://localhost:3000/settings/create-endpoint'
      req.nextauth = { token: { roles: ['admin'] } }
      const response = await middleware(req, res)
      expect(response?.status).toBe(200)
    })

    it('should not redirect admin on /settings/edit-endpoint/abc', async () => {
      const { req, res } = createMocks({ method: 'GET', header: new Headers() })
      req.nextUrl = new URL('http://localhost:3000/settings/edit-endpoint/abc')
      req.url = 'http://localhost:3000/settings/edit-endpoint/abc'
      req.nextauth = { token: { roles: ['admin'] } }
      const response = await middleware(req, res)
      expect(response?.status).toBe(200)
    })

    it('should not redirect non-admin on /programs', async () => {
      const { req, res } = createMocks({ method: 'GET', header: new Headers() })
      req.nextUrl = new URL('http://localhost:3000/programs')
      req.url = 'http://localhost:3000/programs'
      req.nextauth = { token: { roles: [] } }
      const response = await middleware(req, res)
      expect(response?.status).toBe(200)
    })
  })
})
