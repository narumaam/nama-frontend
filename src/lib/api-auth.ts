/**
 * NAMA OS — API Route Auth Utilities
 * ─────────────────────────────────────
 * Two strategies depending on caller type:
 *
 * 1. requireApiKey(request)
 *    For machine-to-machine endpoints (/api/v1/intelligence/*)
 *    Checks: Authorization: Bearer <key>  OR  x-api-key: <key>
 *    Key sourced from NAMA_API_KEY env var (NO FALLBACK in production)
 *
 * 2. requireSession(request)
 *    For browser-initiated endpoints (/api/v1/context/*)
 *    Checks: nama_auth cookie is present and structurally valid (JWT-like)
 *    Same-origin implied by cookie presence + SameSite=Strict
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// ─── API Key auth (machine-to-machine) ───────────────────────────────────────

/**
 * Returns the expected API key from environment variables.
 * CRITICAL: Dev fallback has been removed for security. 
 * If NAMA_API_KEY is missing, all requests will be rejected.
 */
function getExpectedApiKey(): string {
  const envKey = process.env.NAMA_API_KEY;
  
  if (!envKey || envKey.length < 16) {
    // We used to have a fallback here, but it's now removed.
    // In production and dev, we require a real key for machine-to-machine calls.
    return '';
  }
  
  return envKey;
}

export function requireApiKey(request: NextRequest): NextResponse | null {
  const expectedKey = getExpectedApiKey();

  if (!expectedKey) {
    console.error('CRITICAL: NAMA_API_KEY is not set or too short. Rejecting all intelligence API calls.');
    return NextResponse.json(
      { success: false, error: 'Service temporarily unavailable (Authentication misconfigured)' },
      { status: 503 }
    );
  }

  const authHeader = request.headers.get('authorization');
  const apiKeyHeader = request.headers.get('x-api-key');

  let providedKey: string | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    providedKey = authHeader.slice(7).trim();
  } else if (apiKeyHeader) {
    providedKey = apiKeyHeader.trim();
  }

  if (!providedKey || providedKey !== expectedKey) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized — valid API key required' },
      {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Bearer realm="NAMA Intelligence API"',
        },
      }
    );
  }

  return null; // null = authorized, continue handler
}

// ─── Session cookie auth (browser-initiated) ─────────────────────────────────

/**
 * Checks that the request has a structurally valid nama_auth cookie.
 * A valid JWT has 3 dot-separated base64url segments and is >50 chars.
 * This doesn't verify the signature (that's the backend's job) but prevents
 * trivially forged short strings from passing.
 */
function isValidJwtShape(token: string): boolean {
  if (token.length < 50) return false;
  const parts = token.split('.');
  return parts.length === 3 && parts.every(p => p.length > 0);
}

async function hasValidJwtSignature(token: string): Promise<boolean> {
  const secret = process.env.NAMA_JWT_SECRET;
  if (!secret) return false;

  try {
    await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ['HS256'],
    });
    return true;
  } catch {
    return false;
  }
}

export async function requireSession(request: NextRequest): Promise<NextResponse | null> {
  const authCookie = request.cookies.get('nama_auth')?.value;
  const demoCookie = request.cookies.get('nama_demo')?.value;

  // Allow demo mode access to non-sensitive endpoints
  if (demoCookie === '1') return null;

  if (!authCookie || !isValidJwtShape(authCookie)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized — valid session required' },
      { status: 401 }
    );
  }

  const signatureOk = await hasValidJwtSignature(authCookie);
  if (!signatureOk) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized — session verification failed' },
      { status: 401 }
    );
  }

  return null; // null = authorized, continue handler
}
