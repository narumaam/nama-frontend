/**
 * NAMA OS — API Route Auth Utilities
 * ─────────────────────────────────────
 * Two strategies depending on caller type:
 *
 * 1. requireApiKey(request)
 *    For machine-to-machine endpoints (/api/v1/intelligence/*)
 *    Checks: Authorization: Bearer <key>  OR  x-api-key: <key>
 *    Key sourced from NAMA_API_KEY env var (fallback: "nama_dev_key" in dev only)
 *
 * 2. requireSession(request)
 *    For browser-initiated endpoints (/api/v1/context/*)
 *    Checks: nama_auth cookie is present and structurally valid (JWT-like)
 *    Same-origin implied by cookie presence + SameSite=Strict
 */

import { NextRequest, NextResponse } from 'next/server';

// ─── API Key auth (machine-to-machine) ───────────────────────────────────────

const DEV_FALLBACK_KEY = 'nama_dev_key_2025';

function getExpectedApiKey(): string {
  const envKey = process.env.NAMA_API_KEY;
  if (envKey && envKey.length > 12) return envKey;
  // Only allow fallback in non-production
  if (process.env.NODE_ENV !== 'production') return DEV_FALLBACK_KEY;
  return ''; // production with no key set → all requests rejected
}

export function requireApiKey(request: NextRequest): NextResponse | null {
  const expectedKey = getExpectedApiKey();

  if (!expectedKey) {
    return NextResponse.json(
      { success: false, error: 'Service temporarily unavailable' },
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

export function requireSession(request: NextRequest): NextResponse | null {
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

  return null; // null = authorized, continue handler
}
