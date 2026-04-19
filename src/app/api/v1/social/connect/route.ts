/**
 * NAMA OS — Social Media Connect proxy
 * POST /api/v1/social/connect
 *
 * Stores Facebook Page ID + access token + Instagram account ID in
 * tenant.settings, then verifies the token against Meta /me.
 * Requires a valid JWT in the Authorization header.
 */
import { NextRequest, NextResponse } from 'next/server'

const RAILWAY_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://intuitive-blessing-production-30de.up.railway.app'

export async function POST(req: NextRequest) {
  const body = await req.json()

  try {
    const res = await fetch(`${RAILWAY_URL}/api/v1/social/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.NAMA_API_KEY || '',
        Authorization: req.headers.get('Authorization') || '',
      },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json(
      {
        connected: false,
        page_name: '',
        instagram_connected: false,
        error: 'Backend unreachable — check Railway deployment',
      },
      { status: 200 },
    )
  }
}
