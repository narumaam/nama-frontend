import { NextResponse } from 'next/server'

/**
 * NAMA OS — Demo Mode Quick Entry
 * -------------------------------
 * Sets the 'nama_demo' cookie and redirects directly to /dashboard.
 * This bypasses the client-side loading screen for a faster experience.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const dashboardUrl = new URL('/dashboard', url.origin)
  
  const response = NextResponse.redirect(dashboardUrl)
  
  // Set the demo cookie as a SESSION cookie (no maxAge) so it expires
  // automatically when the browser is closed. This prevents stale demo
  // access — users must actively click "See Demo" each session.
  // httpOnly: false is intentional — client-side JS reads this for UI state.
  response.cookies.set('nama_demo', '1', {
    path: '/',
    sameSite: 'lax',   // lax (not strict) so the cookie sends on top-level navigations
    httpOnly: false,
    // No maxAge / no expires → session cookie, cleared on browser close
  })
  
  return response
}
