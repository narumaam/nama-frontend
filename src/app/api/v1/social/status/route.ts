/**
 * NAMA OS — Social Media Status proxy
 * GET /api/v1/social/status
 *
 * Returns the social media connection status + leads captured count
 * for the authenticated tenant.
 * Requires a valid JWT in the Authorization header.
 */
import { NextRequest, NextResponse } from 'next/server'

const RAILWAY_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://intuitive-blessing-production-30de.up.railway.app'

export async function GET(req: NextRequest) {
  try {
    const res = await fetch(`${RAILWAY_URL}/api/v1/social/status`, {
      method: 'GET',
      headers: {
        'x-api-key': process.env.NAMA_API_KEY || '',
        Authorization: req.headers.get('Authorization') || '',
      },
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json(
      {
        facebook_connected: false,
        page_name: '',
        instagram_connected: false,
        leads_captured_count: 0,
        last_lead_at: null,
      },
      { status: 200 },
    )
  }
}
