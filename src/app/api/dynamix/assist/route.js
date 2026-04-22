import { NextResponse } from 'next/server'

import { getAiAssist } from '@/lib/dynamix-data'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const kind = searchParams.get('kind') || 'trip'
  const destination = searchParams.get('destination') || 'Bali'

  return NextResponse.json(getAiAssist(kind, destination))
}
