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

const allowedEnvironments = [
  // qa endpoint
  'a88ebe212beb245098a829c6616a4850-1737523659.us-east-1.elb.amazonaws.com',
  // local
  'localhost'
]

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

  if (req.nextUrl.pathname.startsWith('/qa')) {
    if (allowedEnvironments.some(e => process?.env?.FHIR_CDR_URL?.includes(e))) {
      return NextResponse.next()
    } else {
      return NextResponse.redirect(new URL('/programs', req.url));
    }
  }
  return NextResponse.next()
})
