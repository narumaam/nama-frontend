/**
 * NAMA OS — JWT Middleware Patch (Next.js Edge Middleware)
 * -------------------------------------------------------
 * Replaces the structural-only JWT check with real signature verification
 * using the `jose` library (Edge-runtime compatible, no Node crypto needed).
 *
 * WAR ROOM FIX: "Middleware JWT check is structural only — no signature verification."
 *
 * INTEGRATION INSTRUCTIONS:
 * ─────────────────────────
 * 1. Install jose (already Edge-compatible, no polyfills needed):
 *      npm install jose
 *
 * 2. Copy this file to the Next.js project root as `middleware.ts`:
 *      cp nama-patches/jwt_middleware_patch.ts src/middleware.ts
 *    (or project root `middleware.ts` — depends on your Next.js layout)
 *
 * 3. Set the environment variable on Vercel / .env.local:
 *      NAMA_JWT_SECRET=<same value as backend SECRET_KEY>
 *
 *    The backend FastAPI app uses SECRET_KEY for signing JWTs with HS256.
 *    This middleware needs the identical secret to verify signatures.
 *
 * 4. If you use a different cookie name or header scheme, update the
 *    constants at the top of this file.
 *
 * 5. The middleware sets forwarding headers (x-user-id, x-tenant-id,
 *    x-user-role, x-user-email) so downstream API routes / RSC can
 *    read claims without re-decoding the token.
 *
 * EXPECTED JWT PAYLOAD (from FastAPI backend):
 *   {
 *     sub: string,         // user_id (stringified int)
 *     tenant_id: number,
 *     role: string,        // e.g. "owner" | "super_admin" | "org_admin" | "agent" | "sub_agent"
 *     email: string,
 *     exp: number,         // Unix timestamp
 *     iat?: number
 *   }
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, type JWTPayload } from 'jose';

// ─── Configuration ───────────────────────────────────────────────────────────

/** Cookie that holds the JWT (set by login page / auth-context) */
const AUTH_COOKIE = 'nama_auth';

/** Algorithm the backend uses to sign tokens */
const JWT_ALGORITHM = 'HS256';

/** Environment variable holding the shared secret (must match backend SECRET_KEY) */
const JWT_SECRET_ENV = 'NAMA_JWT_SECRET';

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

  const imgSources = ["'self'", 'data:', 'blob:', 'https:', 'http:'];
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

// ─── Public Routes (no auth required) ────────────────────────────────────────

const PUBLIC_PREFIXES = [
  '/login',
  '/register',
  '/portal/',        // white-label portal pages
  '/_next/',         // Next.js static assets & HMR
  '/favicon',
  '/api/auth/',      // auth endpoints (login, register, refresh)
  '/api/v1/health',  // public health probe used by landing/register/demo surfaces
  '/api/health',     // health check
];

const PUBLIC_EXACT = new Set(['/', '/login', '/register']);

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function applySecurityHeaders(request: NextRequest, response: NextResponse): NextResponse {
  const isGlobe = request.nextUrl.pathname === '/globe.html';
  const isGoogleAuthPage =
    request.nextUrl.pathname === '/login' ||
    request.nextUrl.pathname === '/register';

  response.headers.set('X-Frame-Options', isGlobe ? 'SAMEORIGIN' : 'DENY');
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

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface NamaClaims extends JWTPayload {
  sub: string;
  tenant_id: number;
  role: string;
  email: string;
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow public routes through without any auth check
  if (isPublicRoute(pathname)) {
    return applySecurityHeaders(request, NextResponse.next());
  }

  // 2. Also allow static files and images
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|woff2?|ttf|css|js|map)$/)
  ) {
    return applySecurityHeaders(request, NextResponse.next());
  }

  // 3. Extract the JWT from the cookie (primary) or Authorization header (fallback)
  let token: string | undefined;

  const cookieValue = request.cookies.get(AUTH_COOKIE)?.value;
  if (cookieValue) {
    token = cookieValue;
  }

  if (!token) {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }
  }

  if (!token) {
    return unauthorizedResponse(request, 'Missing authentication token');
  }

  // 4. Verify the JWT signature and expiration using jose
  const secret = process.env[JWT_SECRET_ENV];
  if (!secret) {
    // Misconfiguration — fail closed (deny access), log server-side
    console.error(
      `[NAMA Middleware] ${JWT_SECRET_ENV} environment variable is not set. ` +
      `All authenticated routes will return 401 until this is configured.`
    );
    return unauthorizedResponse(request, 'Server authentication configuration error');
  }

  const secretKey = new TextEncoder().encode(secret);

  try {
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: [JWT_ALGORITHM],
      // jose automatically checks `exp` — tokens past expiry throw JWTExpired
    });

    const claims = payload as NamaClaims;

    // 5. Validate required claims exist
    if (!claims.sub || !claims.tenant_id || !claims.role) {
      return unauthorizedResponse(request, 'Token missing required claims');
    }

    // 6. Forward verified claims as headers for downstream consumption
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', String((claims as NamaClaims & { user_id?: number }).user_id || claims.sub));
    requestHeaders.set('x-tenant-id', String(claims.tenant_id));
    requestHeaders.set('x-user-role', claims.role);
    if (claims.email) {
      requestHeaders.set('x-user-email', claims.email);
    }

    // Remove the raw token from forwarded headers to prevent accidental leakage
    // to upstream proxies (the verified claims are now in x-* headers)
    requestHeaders.delete('authorization');

    return applySecurityHeaders(request, NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    }));
  } catch (error: unknown) {
    // Differentiate error types for better debugging / client messages
    const err = error as Error;
    const name = err?.name ?? '';

    if (name === 'JWTExpired') {
      return unauthorizedResponse(request, 'Token has expired', 401);
    }
    if (name === 'JWTClaimValidationFailed') {
      return unauthorizedResponse(request, 'Token claim validation failed', 401);
    }
    if (name === 'JWSSignatureVerificationFailed') {
      return unauthorizedResponse(request, 'Invalid token signature', 401);
    }
    // JWSInvalid, JWTInvalid, etc.
    return unauthorizedResponse(request, 'Invalid authentication token', 401);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function unauthorizedResponse(
  request: NextRequest,
  message: string,
  status: number = 401,
): NextResponse {
  // For API routes, return JSON
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return applySecurityHeaders(request, NextResponse.json(
      { error: 'unauthorized', message },
      { status },
    ));
  }

  // For page routes, redirect to login with a return URL
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.searchParams.set('returnTo', request.nextUrl.pathname);
  loginUrl.searchParams.set('reason', 'session_expired');
  return applySecurityHeaders(request, NextResponse.redirect(loginUrl));
}

// ─── Matcher ─────────────────────────────────────────────────────────────────
// Tell Next.js which paths this middleware should run on.
// We include everything except static asset paths to keep the matcher simple;
// the isPublicRoute() check above handles fine-grained skipping.

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
