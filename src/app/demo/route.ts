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
  
  // Set the demo cookie (valid for 1 hour)
  // sameSite: 'strict' prevents cross-site cookie submission
  // httpOnly: false is intentional — client-side JS reads this to adjust UI
  response.cookies.set('nama_demo', '1', {
    path: '/',
    maxAge: 3600,
    sameSite: 'strict',
    httpOnly: false,
  })
  
  return response
}
