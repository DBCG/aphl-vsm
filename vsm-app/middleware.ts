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
    '/((?!api/auth|api/health|auth|images|_next/static|favicon.ico).*)'
  ]
}

export default withAuth(function middleware(req: NextRequest) {
  const addHeader = ['POST', 'PUT', 'DELETE'].includes(req.method)
  if (addHeader) {
    const requestHeaders = new Headers(req.headers)
    requestHeaders.set('Content-Type', 'application/json')
    return NextResponse.next({
      request: {
        // New request headers
        headers: requestHeaders,
      },
    })
  }
  return NextResponse.next()
})
