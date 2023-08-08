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

export { default } from 'next-auth/middleware'
