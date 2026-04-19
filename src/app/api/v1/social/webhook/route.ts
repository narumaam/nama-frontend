/**
 * NAMA OS — Social Media Webhook proxy
 * GET  /api/v1/social/webhook  — Meta hub.challenge verification (no auth)
 * POST /api/v1/social/webhook  — Inbound Facebook Lead Ads / Instagram DM events (no auth)
 *
 * This route is intentionally public — Meta must be able to call it without
 * any authentication headers. HMAC-SHA256 signature validation is performed
 * on the Railway backend instead.
 */
import { NextRequest, NextResponse } from 'next/server'

const RAILWAY_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://intuitive-blessing-production-30de.up.railway.app'

/**
 * GET — Meta webhook subscription verification.
 * Meta sends hub.mode, hub.verify_token, hub.challenge as query params.
 * The backend echoes hub.challenge as plain text.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const upstream = new URL(`${RAILWAY_URL}/api/v1/social/webhook`)
  searchParams.forEach((value, key) => upstream.searchParams.set(key, value))

  try {
    const res = await fetch(upstream.toString(), {
      method: 'GET',
      headers: {
        'x-api-key': process.env.NAMA_API_KEY || '',
      },
    })
    const text = await res.text()
    return new NextResponse(text, {
      status: res.status,
      headers: { 'Content-Type': 'text/plain' },
    })
  } catch {
    return new NextResponse('Verification failed', { status: 403 })
  }
}

/**
 * POST — Inbound Meta event (Facebook Lead Ads leadgen / Instagram DMs).
 * Forwards the raw body and all original headers (including X-Hub-Signature-256)
 * to Railway for HMAC validation and background processing.
 * Always returns 200 so Meta does not retry.
 */
export async function POST(req: NextRequest) {
  const bodyBuffer = await req.arrayBuffer()

  try {
    const res = await fetch(`${RAILWAY_URL}/api/v1/social/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': req.headers.get('Content-Type') || 'application/json',
        'X-Hub-Signature-256': req.headers.get('X-Hub-Signature-256') || '',
        'x-api-key': process.env.NAMA_API_KEY || '',
      },
      body: bodyBuffer,
    })
    const data = await res.json().catch(() => ({ status: 'ok' }))
    return NextResponse.json(data, { status: 200 })
  } catch {
    // Always return 200 to Meta — errors are logged on the backend
    return NextResponse.json({ status: 'ok' }, { status: 200 })
  }
}
