import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * NAMA Auth Middleware — HS-1 Frontend Enforcement
 * -------------------------------------------------
 * Protects all /dashboard and /kinetic routes.
 * Checks for `nama_auth` cookie (set on login via auth-context.tsx).
 * Unauthenticated requests are redirected to the homepage.
 *
 * Note: localStorage is not accessible in middleware (runs on Edge).
 * The auth-context sets a sama-named cookie in addition to localStorage
 * so middleware can verify auth server-side.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check for auth cookie (set by auth-context on login)
  const authCookie = request.cookies.get('nama_auth')?.value
  const isAuthenticated = !!authCookie && authCookie.length > 10

  if (!isAuthenticated) {
    // Redirect unauthenticated users to homepage with redirect hint
    const redirectUrl = new URL('/', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return NextResponse.next()
}

export const config = {
  // Protect all dashboard sub-routes, Kinetic command center, and internal portals
  matcher: [
    '/dashboard',
    '/dashboard/:path*',
    '/kinetic',
    '/owner',
    '/owner/:path*',
    '/super-admin',
    '/super-admin/:path*',
  ],
}
