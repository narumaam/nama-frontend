/**
 * NAMA OS — Website Lead Capture Proxy
 * ──────────────────────────────────────
 * Forwards GET and POST requests to the Railway backend's
 * /api/v1/capture/* endpoints. No auth wrapper — the backend
 * authenticates via the `capture_token` query param.
 *
 * Handles:
 *   GET  /api/v1/capture/verify?token=xxx
 *   POST /api/v1/capture/lead?token=xxx
 *
 * Also used for admin endpoints when called with a Bearer token:
 *   GET  /api/v1/capture/generate-token
 *   POST /api/v1/capture/rotate-token
 *   GET  /api/v1/capture/stats
 */

import { NextRequest, NextResponse } from 'next/server';

const RAILWAY_BASE =
  process.env.RAILWAY_BACKEND_URL ||
  'https://intuitive-blessing-production-30de.up.railway.app';

async function proxyToRailway(
  request: NextRequest,
  method: string,
): Promise<NextResponse> {
  const { pathname, search } = new URL(request.url);
  const upstreamUrl = `${RAILWAY_BASE}${pathname}${search}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Forward Authorization header if present (for admin endpoints)
  const authHeader = request.headers.get('Authorization');
  if (authHeader) {
    headers['Authorization'] = authHeader;
  }

  // Forward real IP for rate limiting on backend
  const forwardedFor =
    request.headers.get('x-forwarded-for') ??
    request.headers.get('x-real-ip') ??
    '127.0.0.1';
  headers['x-forwarded-for'] = forwardedFor;

  let body: string | undefined;
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    try {
      body = await request.text();
    } catch {
      body = undefined;
    }
  }

  try {
    const upstream = await fetch(upstreamUrl, {
      method,
      headers,
      body,
    });

    const responseData = await upstream.text();

    return new NextResponse(responseData, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
        // Allow widget.js served from any origin to call this endpoint
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (err) {
    console.error('[capture proxy] upstream error:', err);
    return NextResponse.json(
      { detail: 'Upstream service unavailable. Please try again.' },
      { status: 502 },
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return proxyToRailway(request, 'GET');
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return proxyToRailway(request, 'POST');
}

// Handle CORS pre-flight so widget.js on third-party sites works
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age':       '86400',
    },
  });
}
