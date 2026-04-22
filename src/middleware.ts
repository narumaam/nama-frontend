import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function buildCsp(frameAncestors: string) {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https: http:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://*.getnama.app https://*.up.railway.app https://*.vercel.app wss:",
    `frame-ancestors ${frameAncestors}`,
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const isGlobe = request.nextUrl.pathname === '/globe.html';

  response.headers.set(
    'X-Frame-Options',
    isGlobe ? 'SAMEORIGIN' : 'DENY'
  );
  response.headers.set(
    'Content-Security-Policy',
    buildCsp(isGlobe ? "'self'" : "'none'")
  );

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
