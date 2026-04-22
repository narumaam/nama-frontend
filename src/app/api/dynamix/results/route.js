import { NextResponse } from 'next/server'

import { getSessionFromRequest } from '@/lib/dynamix-auth'
import { createHolidayMatchesForSearch, getSearchResults } from '@/lib/dynamix-db'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const session = getSessionFromRequest(request)
  const destination = searchParams.get('destination') || 'Bali'
  const searchId = searchParams.get('searchId')
  const packageType = searchParams.get('packageType')
  const travelerType = searchParams.get('travelerType')

  if (searchId && !session.isAuthenticated) {
    return NextResponse.json(
      { error: 'Authentication required for Dynamix results.' },
      { status: 401 }
    )
  }

  const data = searchId
    ? await createHolidayMatchesForSearch(searchId, destination, session)
    : await getSearchResults({
        destination,
        packageType,
        travelerType,
      })

  return NextResponse.json({ data })
}
