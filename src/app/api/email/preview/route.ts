import { NextRequest, NextResponse } from 'next/server'
import { render } from '@react-email/render'
import * as React from 'react'
import WelcomeEmail from '@/emails/WelcomeEmail'
import DayOneEmail from '@/emails/DayOneEmail'
import DayThreeEmail from '@/emails/DayThreeEmail'
import DaySevenEmail from '@/emails/DaySevenEmail'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const day = parseInt(searchParams.get('day') ?? '0', 10)
  const name = searchParams.get('name') ?? 'Prateek'
  const agency = searchParams.get('agency') ?? 'Wanderlust Travels'

  let component: React.ReactElement

  switch (day) {
    case 0:
      component = React.createElement(WelcomeEmail, { name, agencyName: agency })
      break
    case 1:
      component = React.createElement(DayOneEmail, { name, agencyName: agency })
      break
    case 3:
      component = React.createElement(DayThreeEmail, { name })
      break
    case 7:
      component = React.createElement(DaySevenEmail, { name })
      break
    default:
      return new NextResponse('Unknown day — valid values are 0, 1, 3, 7', { status: 400 })
  }

  const html = await render(component)
  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
