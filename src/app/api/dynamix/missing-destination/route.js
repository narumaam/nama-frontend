import { NextResponse } from 'next/server'
import { Resend } from 'resend'

import { getSessionFromRequest } from '@/lib/dynamix-auth'

const FROM = process.env.RESEND_FROM_EMAIL || 'NAMA OS <onboarding@getnama.app>'
const PRODUCT_MANAGER_EMAIL =
  process.env.NAMA_PRODUCT_EMAIL ||
  process.env.PRODUCT_MANAGER_EMAIL ||
  process.env.RESEND_FROM_EMAIL ||
  'product@getnama.app'

export async function POST(request) {
  try {
    const body = await request.json()
    const destination = body?.destination?.trim()
    if (!destination) {
      return NextResponse.json({ error: 'Destination is required.' }, { status: 400 })
    }

    const session = getSessionFromRequest(request)
    const agentEmail =
      body?.agentEmail?.trim() ||
      session.agentEmail ||
      'unknown-agent@getnama.app'

    const startDate = body?.startDate || 'Unknown'
    const endDate = body?.endDate || 'Unknown'
    const duration = body?.duration || 'Unknown'
    const pax = body?.pax || 'Unknown'

    if (!process.env.RESEND_API_KEY) {
      console.log(
        `[dynamix/missing-destination] RESEND_API_KEY not set — simulated alert for ${destination} from ${agentEmail}`
      )
      return NextResponse.json({ sent: false, demo: true })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)

    const html = `
      <div style="font-family: Inter, Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2 style="margin-bottom: 12px;">Dynamix missing destination alert</h2>
        <p>A travel agent searched for a destination that currently has no Dynamix package content.</p>
        <ul>
          <li><strong>Destination:</strong> ${destination}</li>
          <li><strong>Agent email:</strong> ${agentEmail}</li>
          <li><strong>Travel dates:</strong> ${startDate} to ${endDate}</li>
          <li><strong>Duration:</strong> ${duration}</li>
          <li><strong>Pax:</strong> ${pax}</li>
        </ul>
        <p>Please review whether this destination should be added to the Dynamix catalog.</p>
      </div>
    `

    const result = await resend.emails.send({
      from: FROM,
      to: PRODUCT_MANAGER_EMAIL,
      subject: `Dynamix missing destination: ${destination}`,
      html,
    })

    return NextResponse.json({ sent: true, id: result.data?.id || null })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[dynamix/missing-destination] error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
