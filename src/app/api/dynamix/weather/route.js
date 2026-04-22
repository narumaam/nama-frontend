import { NextResponse } from 'next/server'

import { getWeatherSummary } from '@/lib/dynamix-db'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const destination = searchParams.get('destination') || 'Bali'

  return NextResponse.json(await getWeatherSummary(destination))
}
