import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Vercel sets this header automatically based on IP geolocation
  const country = request.headers.get('x-vercel-ip-country') || 'IN'
  const currency = country === 'IN' ? 'INR' : 'USD'

  return NextResponse.json({ currency, country }, {
    headers: {
      'Cache-Control': 'public, max-age=3600', // cache for 1 hour
    }
  })
}
