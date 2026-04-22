import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function buildCsp({
  frameAncestors,
  allowCdnjsScripts = false,
}: {
  frameAncestors: string;
  allowCdnjsScripts?: boolean;
}) {
  const scriptSources = [
    "'self'",
    "'unsafe-inline'",
    "'unsafe-eval'",
    'https://vercel.live',
  ];

  if (allowCdnjsScripts) {
    scriptSources.push('https://cdnjs.cloudflare.com');
  }

  return [
    "default-src 'self'",
    `script-src ${scriptSources.join(' ')}`,
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
    buildCsp({
      frameAncestors: isGlobe ? "'self'" : "'none'",
      allowCdnjsScripts: isGlobe,
    })
  );

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
