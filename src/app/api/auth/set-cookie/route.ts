/**
 * NAMA OS — Secure Cookie Setter
 * ────────────────────────────────
 * POST /api/auth/set-cookie
 *
 * Sets the nama_auth cookie server-side so it can carry the HttpOnly flag.
 * HttpOnly cookies cannot be set via document.cookie from JavaScript —
 * they must come from a Set-Cookie response header on a server response.
 *
 * Called by auth-context immediately after a successful login.
 * The browser never handles the raw token after this point — it lives
 * exclusively in an HttpOnly, Secure, SameSite=Strict cookie.
 *
 * DELETE /api/auth/set-cookie — clears the cookie on logout.
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

const COOKIE_NAME = 'nama_auth';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

// Basic JWT shape check — 3 dot-separated base64url segments, min 50 chars
function isValidJwtShape(token: string): boolean {
  if (token.length < 50) return false;
  const parts = token.split('.');
  return parts.length === 3 && parts.every(p => p.length > 0);
}

async function verifyJwtSignature(token: string): Promise<boolean> {
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

export async function POST(request: NextRequest) {
  const rateLimitError = await rateLimit(request, RATE_LIMITS.auth);
  if (rateLimitError) return rateLimitError;

  try {
    const body = await request.json() as { token?: string };

    if (!body.token || !isValidJwtShape(body.token)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing token' },
        { status: 400 }
      );
    }

    const tokenVerified = await verifyJwtSignature(body.token);
    if (!tokenVerified) {
      return NextResponse.json(
        { success: false, error: 'Token signature verification failed' },
        { status: 401 }
      );
    }

    const isProduction = process.env.NODE_ENV === 'production';

    const response = NextResponse.json({ success: true });

    response.cookies.set(COOKIE_NAME, body.token, {
      httpOnly: true,                    // not accessible to JavaScript
      secure: isProduction,              // HTTPS only in production
      sameSite: 'strict',               // CSRF protection
      maxAge: MAX_AGE_SECONDS,
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });

  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });

  return response;
}
