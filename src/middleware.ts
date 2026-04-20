import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

/**
 * NAMA Auth Middleware — HS-1 Frontend Enforcement (Hardened)
 * -----------------------------------------------------------
 * Protects all /dashboard, /kinetic, /owner, and /super-admin routes.
 * 
 * New in V6: Full JWT signature verification using `jose` on the Edge.
 * Previously only validated the token shape; now validates the signature 
 * against the NAMA_JWT_SECRET environment variable.
 *
 * Auth Rules:
 *   (a) `nama_auth` cookie passes signature verification → authenticated user
 *   (b) `nama_demo` cookie is set → demo/guest visitor (dashboard only)
 * 
 * /owner and /super-admin require a real auth token (no demo bypass).
 */

const JWT_SECRET = process.env.NAMA_JWT_SECRET;
const encoder = new TextEncoder();
const secretKey = JWT_SECRET ? encoder.encode(JWT_SECRET) : null;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = request.headers.get('host') || ''

  // demo.getnama.app → auto-activate demo mode, redirect to /dashboard
  if (hostname.startsWith('demo.')) {
    const dashboardUrl = new URL('/dashboard', request.url)
    const response = NextResponse.redirect(dashboardUrl)
    response.cookies.set('nama_demo', '1', {
      path: '/',
      sameSite: 'lax',
      httpOnly: false,
    })
    return response
  }

  // Check for cookies
  const authCookie = request.cookies.get('nama_auth')?.value
  const demoCookie = request.cookies.get('nama_demo')?.value
  const isDemoMode = demoCookie === '1'

  // Admin routes ALWAYS require real JWT auth — no demo bypass
  const isAdminRoute = pathname.startsWith('/owner') || pathname.startsWith('/super-admin')

  let isAuthenticated = false
  let userRole: string | null = null

  if (authCookie) {
    if (!secretKey) {
      console.error('CRITICAL: NAMA_JWT_SECRET is not configured in Vercel. Auth rejected.')
    } else {
      try {
        // Full signature verification using jose (edge-compatible)
        const { payload } = await jwtVerify(authCookie, secretKey)
        isAuthenticated = true
        userRole = payload.role as string

        // Admin routes require R_NAMA_STAFF role
        if (isAdminRoute && userRole !== 'R_NAMA_STAFF') {
          return NextResponse.redirect(new URL('/dashboard', request.url))
        }
        
        // Pass the role to the request headers so server components can use it without re-verifying
        const requestHeaders = new Headers(request.headers)
        requestHeaders.set('x-user-role', userRole || '')
        
        // Continue with the original request but with our new headers
        return NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        })
      } catch (err) {
        console.warn('JWT Verification failed:', err instanceof Error ? err.message : 'Invalid signature')
        // We'll clear the invalid cookie to avoid a loop
        const response = NextResponse.redirect(new URL('/login', request.url))
        response.cookies.delete('nama_auth')
        return response
      }
    }
  }

  // Redirect to login if not authenticated AND (it's an admin route OR not in demo mode)
  if (!isAuthenticated && (!isDemoMode || isAdminRoute)) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return NextResponse.next()
}

export const config = {
  // Protect all dashboard sub-routes, Kinetic command center, and internal portals
  // Also match root (/) so demo.getnama.app hostname redirect fires on landing
  matcher: [
    '/',
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
