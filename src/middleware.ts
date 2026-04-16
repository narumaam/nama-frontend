import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * NAMA Auth Middleware — HS-1 Frontend Enforcement
 * -------------------------------------------------
 * Protects all /dashboard and /kinetic routes.
 * Allows through if either:
 *   (a) `nama_auth` cookie is set   → authenticated user
 *   (b) `nama_demo` cookie is set   → demo/guest visitor
 *
 * Note: localStorage is not accessible in middleware (runs on Edge).
 * auth-context sets `nama_auth` cookie on login.
 * /demo page sets `nama_demo=1` cookie before redirecting to /dashboard.
 *
 * /owner and /super-admin require a real auth token (no demo bypass).
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check for auth cookie (set by auth-context on login)
  const authCookie  = request.cookies.get('nama_auth')?.value
  const demoCookie  = request.cookies.get('nama_demo')?.value
  const isAuthenticated = (!!authCookie && authCookie.length > 10)
  const isDemoMode      = demoCookie === '1'

  // /owner and /super-admin require a real authenticated session — no demo bypass
  const isAdminRoute = pathname.startsWith('/owner') || pathname.startsWith('/super-admin')

  if (!isAuthenticated && (!isDemoMode || isAdminRoute)) {
    const redirectUrl = new URL('/login', request.url)
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
