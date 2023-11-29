import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from 'next-auth/middleware'

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/auth|auth|images|_next/static|favicon.ico).*)'
  ]
}

const isJsonRoute = (pathsToSkip: string[], path: string): boolean => {
  return Boolean(pathsToSkip.find(p => !path.toLowerCase().includes(p.toLowerCase())))
}

function addJsonMiddleware(req: NextRequest): NextRequest {
  // in case you want to avoid adding json header to some api paths
  const pathsToSkip = ['/auth']
  const { pathname } = req.nextUrl

  const addHeader = isJsonRoute(pathsToSkip, pathname)
    // Clone the request headers and set a new header for `application/json`
    // in most circumstances
    if (addHeader) {
      const requestHeaders = new Headers(req.headers)
      requestHeaders.set('Content-Type', 'application/json')
      console.log('headers: ', requestHeaders)
    }
    console.log('req: ', req)
    return req
}

const middleWares = [withAuth, addJsonMiddleware]

export default async function middleware(req: NextRequest) {
  let reqToSend = req
  for await (const fn of middleWares) {
    reqToSend = await fn(req)
  }
  return NextResponse.next()
}

