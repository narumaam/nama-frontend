/**
 * NAMA OS — WhatsApp status proxy
 * GET /api/v1/whatsapp/status
 *
 * Passes the request through to the Railway backend.
 * Falls back to demo mode when the backend is unreachable.
 */
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const railwayUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    'https://intuitive-blessing-production-30de.up.railway.app'

  try {
    const res = await fetch(`${railwayUrl}/api/v1/whatsapp/status`, {
      method: 'GET',
      headers: {
        'x-api-key': process.env.NAMA_API_KEY || '',
        Authorization: req.headers.get('Authorization') || '',
      },
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    // Backend unreachable — return demo mode so UI never breaks
    return NextResponse.json(
      {
        connected: false,
        mode: 'demo',
        message: 'Add WHATSAPP_TOKEN and WHATSAPP_PHONE_ID in Railway to activate',
      },
      { status: 200 },
    )
  }
}
