import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * NAMA OS — Demo Mode Quick Entry
 * --------------------------------
 * Handles two entry points:
 *   1. demo.getnama.app   → any request to this hostname sets demo cookie + redirects to dashboard
 *   2. getnama.app/demo   → same behaviour (legacy/direct link support)
 *
 * The nama_demo=1 cookie is a SESSION cookie (no maxAge) so it clears on browser close,
 * preventing stale demo access across sessions.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const dashboardUrl = new URL('/dashboard', url.origin)

  const response = NextResponse.redirect(dashboardUrl)

  response.cookies.set('nama_demo', '1', {
    path: '/',
    sameSite: 'lax',
    httpOnly: false,
    // No maxAge → session cookie, clears when browser closes
  })

  return response
}
