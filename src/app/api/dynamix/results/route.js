import { NextResponse } from 'next/server'

import { createHolidayMatchesForSearch, getSearchResults } from '@/lib/dynamix-db'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const destination = searchParams.get('destination') || 'Bali'
  const searchId = searchParams.get('searchId')
  const packageType = searchParams.get('packageType')
  const travelerType = searchParams.get('travelerType')

  const data = searchId
    ? await createHolidayMatchesForSearch(searchId, destination)
    : await getSearchResults({
        destination,
        packageType,
        travelerType,
      })

  return NextResponse.json({ data })
}
