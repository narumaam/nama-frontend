import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { render } from '@react-email/render'
import * as React from 'react'
import WelcomeEmail from '@/emails/WelcomeEmail'
import DayOneEmail from '@/emails/DayOneEmail'
import DayThreeEmail from '@/emails/DayThreeEmail'
import DaySevenEmail from '@/emails/DaySevenEmail'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL || 'NAMA OS <onboarding@getnama.app>'

const SUBJECTS: Record<number, string> = {
  0: 'Welcome to NAMA OS 🚀 — your travel command centre is ready',
  1: 'One tip that saves hours every week',
  3: '3 agencies closed ₹2L+ deals in their first 72 hours on NAMA',
  7: "Is NAMA working for you? Let's make sure.",
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, name, agency_name, day } = body as {
      email: string
      name: string
      agency_name?: string
      day: number
    }

    if (!email || !name || day === undefined) {
      return NextResponse.json({ error: 'Missing required fields: email, name, day' }, { status: 400 })
    }

    if (!process.env.RESEND_API_KEY) {
      console.log(`[email/drip] RESEND_API_KEY not set — simulating Day ${day} drip to ${email}`)
      return NextResponse.json({ sent: false, demo: true, day })
    }

    const agencyName = agency_name || 'Your Agency'
    let emailComponent: React.ReactElement

    switch (day) {
      case 0:
        emailComponent = React.createElement(WelcomeEmail, { name, agencyName })
        break
      case 1:
        emailComponent = React.createElement(DayOneEmail, { name, agencyName })
        break
      case 3:
        emailComponent = React.createElement(DayThreeEmail, { name })
        break
      case 7:
        emailComponent = React.createElement(DaySevenEmail, { name })
        break
      default:
        return NextResponse.json({ error: `Unknown drip day: ${day}` }, { status: 400 })
    }

    const html = await render(emailComponent)
    const subject = SUBJECTS[day] ?? `NAMA OS — Day ${day}`

    const result = await resend.emails.send({
      from: FROM,
      to: email,
      subject,
      html,
    })

    return NextResponse.json({ sent: true, day, id: result.data?.id })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[email/drip] error:', err)
    return NextResponse.json({ sent: false, error: message }, { status: 500 })
  }
}
