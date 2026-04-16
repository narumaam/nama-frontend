import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * NAMA Auth Middleware — HS-1 Frontend Enforcement
 * -------------------------------------------------
 * Protects all /dashboard, /kinetic, /owner, and /super-admin routes.
 * Allows through if either:
 *   (a) `nama_auth` cookie passes structural JWT validation → authenticated user
 *   (b) `nama_demo` cookie is set  → demo/guest visitor (dashboard only)
 *
 * Note: localStorage is not accessible in middleware (runs on Edge).
 * /api/auth/set-cookie sets `nama_auth` as HttpOnly after login.
 * /demo page sets `nama_demo=1` cookie before redirecting to /dashboard.
 *
 * /owner and /super-admin require a real auth token (no demo bypass).
 *
 * Security: token is validated for JWT shape (3 segments, min 50 chars).
 * Full signature verification is enforced by the Railway API backend.
 */

/**
 * Validates that a token looks like a real JWT:
 * - At least 50 characters
 * - Exactly 3 base64url-encoded segments separated by dots
 * Prevents trivially forged short strings (e.g. "helloworld123") from passing.
 */
function isValidJwtShape(token: string): boolean {
  if (token.length < 50) return false
  const parts = token.split('.')
  return parts.length === 3 && parts.every(p => /^[A-Za-z0-9_-]+$/.test(p) && p.length > 0)
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check for auth cookie (set server-side by /api/auth/set-cookie — HttpOnly)
  const authCookie  = request.cookies.get('nama_auth')?.value
  const demoCookie  = request.cookies.get('nama_demo')?.value
  const isAuthenticated = !!authCookie && isValidJwtShape(authCookie)
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
  // Note: /portal/:path* and /proposal/:path* are intentionally excluded (public routes)
  matcher: [
    '/dashboard',
    '/dashboard/:path*',
    '/kinetic',
    '/kinetic/:path*',
    '/owner',
    '/owner/:path*',
    '/super-admin',
    '/super-admin/:path*',
  ],
}
