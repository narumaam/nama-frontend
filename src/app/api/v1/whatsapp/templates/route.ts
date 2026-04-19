/**
 * NAMA OS — WhatsApp templates proxy
 * GET /api/v1/whatsapp/templates
 *
 * Passes the request through to the Railway backend.
 * Falls back to static template list when the backend is unreachable.
 */
import { NextRequest, NextResponse } from 'next/server'

const FALLBACK_TEMPLATES = {
  templates: [
    {
      name: 'lead_acknowledgement',
      language: 'en',
      category: 'UTILITY',
      body: "Hi {{1}}, thanks for reaching out to {{2}}! We've received your enquiry about {{3}} and will get back to you shortly. — {{4}}",
      params: ['client_name', 'agency_name', 'destination', 'agent_name'],
    },
    {
      name: 'quote_ready',
      language: 'en',
      category: 'UTILITY',
      body: 'Hi {{1}}, your personalised travel quote for {{2}} is ready! Total: {{3}}. View it here: {{4}}',
      params: ['client_name', 'destination', 'amount', 'quote_link'],
    },
    {
      name: 'booking_confirmed',
      language: 'en',
      category: 'UTILITY',
      body: '✅ Booking confirmed! Hi {{1}}, your trip to {{2}} on {{3}} is confirmed. Booking ref: {{4}}. Have a great trip!',
      params: ['client_name', 'destination', 'travel_date', 'booking_ref'],
    },
    {
      name: 'follow_up',
      language: 'en',
      category: 'MARKETING',
      body: "Hi {{1}}, just checking in on your {{2}} enquiry. Any questions? We're here to help!",
      params: ['client_name', 'destination'],
    },
    {
      name: 'payment_reminder',
      language: 'en',
      category: 'UTILITY',
      body: 'Hi {{1}}, a friendly reminder that ₹{{2}} is due for your {{3}} booking. Pay here: {{4}}',
      params: ['client_name', 'amount', 'destination', 'payment_link'],
    },
  ],
}

export async function GET(req: NextRequest) {
  const railwayUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    'https://intuitive-blessing-production-30de.up.railway.app'

  try {
    const res = await fetch(`${railwayUrl}/api/v1/whatsapp/templates`, {
      method: 'GET',
      headers: {
        'x-api-key': process.env.NAMA_API_KEY || '',
        Authorization: req.headers.get('Authorization') || '',
      },
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    // Backend unreachable — return static fallback so UI never breaks
    return NextResponse.json(FALLBACK_TEMPLATES, { status: 200 })
  }
}
