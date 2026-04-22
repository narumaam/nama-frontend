import { NextResponse } from 'next/server'

import { getSessionFromRequest } from '@/lib/dynamix-auth'
import { createTripSearch } from '@/lib/dynamix-db'
import { validateTripQuery } from '@/lib/dynamix-validators'

export async function POST(request) {
  const session = getSessionFromRequest(request)

  if (!session.isAuthenticated) {
    return NextResponse.json(
      { ok: false, error: 'Authentication required for Dynamix preview.' },
      { status: 401 }
    )
  }

  const body = await request.json()
  const query = body?.query
  const validationError = validateTripQuery(query)

  if (validationError) {
    return NextResponse.json(
      { ok: false, error: validationError },
      { status: 400 }
    )
  }

  if (!session.isDemo && !session.agentEmail) {
    return NextResponse.json(
      { ok: false, error: 'Authenticated Dynamix session is missing agent identity.' },
      { status: 401 }
    )
  }

  const createdSearch = await createTripSearch(body, session)

  return NextResponse.json({
    ok: true,
    searchId: createdSearch.id,
    persisted: createdSearch.persisted,
  })
}
