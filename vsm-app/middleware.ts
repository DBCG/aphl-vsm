import { NextResponse } from 'next/server'
import { withAuth, NextRequestWithAuth } from 'next-auth/middleware'

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/auth|api/health|api/fhir|auth|images|_next/static|favicon.ico).*)'
  ]
}

export default withAuth(function middleware(req: NextRequestWithAuth) {
  const roles = (req.nextauth.token?.roles as string[]) || []
  const isAdmin = roles.includes('admin')

  const adminOnlyPaths = ['/settings/create-endpoint', '/settings/edit-endpoint']
  if (adminOnlyPaths.some(p => req.nextUrl.pathname.startsWith(p)) && !isAdmin) {
    return NextResponse.redirect(new URL('/programs', req.url))
  }

  const addHeader = ['POST', 'PUT', 'DELETE'].includes(req.method)
  if (addHeader) {
    const requestHeaders = new Headers(req.headers)
    requestHeaders.set('Content-Type', 'application/json')
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  return NextResponse.next()
}, {
  pages: {
    signIn: '/auth/signin'
  }
})
