import { getSession } from "next-auth/react";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const cookie = request.headers.get("cookie"),
    session: any = cookie
      ? await getSession({ req: { headers: { cookie } } as any })
      : null;

  if (!session || session.response == false) {
    return NextResponse.redirect(new URL("/api/auth/signin", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/auth|_next/static|favicon.ico).*)',
  ],
}