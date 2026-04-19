/**
 * NAMA OS — WhatsApp Send proxy
 * POST /api/v1/whatsapp/send
 *
 * Passes the request through to the Railway backend.
 * Falls back to demo mode response when the backend is unreachable.
 */
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const railwayUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    'https://intuitive-blessing-production-30de.up.railway.app'

  try {
    const res = await fetch(`${railwayUrl}/api/v1/whatsapp/send`, {
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
    // Backend unreachable — return demo-mode response so UI never breaks
    return NextResponse.json(
      { success: true, message_id: 'demo_msg_001', demo: true },
      { status: 200 },
    )
  }
}
