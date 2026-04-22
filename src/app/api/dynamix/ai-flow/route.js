import { NextResponse } from 'next/server'

import { getAiFlowPayload } from '@/lib/dynamix-ai-service'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const kind = searchParams.get('kind') || 'blueprint'
  const categorySlug = searchParams.get('categorySlug') || 'reset-retreat'
  const destination = searchParams.get('destination') || 'Bali'

  const data = await getAiFlowPayload({ kind, categorySlug, destination })

  return NextResponse.json({ data })
}
