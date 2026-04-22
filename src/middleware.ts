import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function buildCsp({
  frameAncestors,
  allowCdnjsScripts = false,
  allowGoogleAuth = false,
}: {
  frameAncestors: string;
  allowCdnjsScripts?: boolean;
  allowGoogleAuth?: boolean;
}) {
  const scriptSources = [
    "'self'",
    "'unsafe-inline'",
    "'unsafe-eval'",
    'https://vercel.live',
  ];

  const imgSources = [
    "'self'",
    'data:',
    'blob:',
    'https:',
    'http:',
  ];

  const connectSources = [
    "'self'",
    'https://*.getnama.app',
    'https://*.up.railway.app',
    'https://*.vercel.app',
    'wss:',
  ];

  const frameSources = ["'self'"];

  if (allowCdnjsScripts) {
    scriptSources.push('https://cdnjs.cloudflare.com');
  }

  if (allowGoogleAuth) {
    scriptSources.push('https://accounts.google.com', 'https://apis.google.com');
    connectSources.push(
      'https://accounts.google.com',
      'https://oauth2.googleapis.com',
      'https://www.googleapis.com'
    );
    frameSources.push('https://accounts.google.com');
    imgSources.push('https://*.googleusercontent.com', 'https://lh3.googleusercontent.com');
  }

  return [
    "default-src 'self'",
    `script-src ${scriptSources.join(' ')}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    `img-src ${imgSources.join(' ')}`,
    "font-src 'self' https://fonts.gstatic.com",
    `connect-src ${connectSources.join(' ')}`,
    `frame-src ${frameSources.join(' ')}`,
    `frame-ancestors ${frameAncestors}`,
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const isGlobe = request.nextUrl.pathname === '/globe.html';
  const isGoogleAuthPage =
    request.nextUrl.pathname === '/login' ||
    request.nextUrl.pathname === '/register';

  response.headers.set(
    'X-Frame-Options',
    isGlobe ? 'SAMEORIGIN' : 'DENY'
  );
  response.headers.set(
    'Content-Security-Policy',
    buildCsp({
      frameAncestors: isGlobe ? "'self'" : "'none'",
      allowCdnjsScripts: isGlobe,
      allowGoogleAuth: isGoogleAuthPage,
    })
  );

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
