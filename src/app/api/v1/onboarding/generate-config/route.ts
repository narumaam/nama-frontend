/**
 * NAMA OS — AI Agency Config Generator
 * ──────────────────────────────────────
 * POST /api/v1/onboarding/generate-config
 *
 * Accepts { description: string } and calls the backend
 * POST /api/v1/copilot/generate-config which runs the description through
 * an LLM (OpenRouter/Anthropic) to produce a structured AgencyConfig JSON.
 *
 * Falls back gracefully — the backend always returns a config even if the
 * LLM is unavailable (keyword-based heuristic fallback).
 */

import { NextRequest, NextResponse } from 'next/server'

const BACKEND =
  process.env.NEXT_PUBLIC_API_URL || 'https://intuitive-blessing-production-30de.up.railway.app'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.description || typeof body.description !== 'string') {
      return NextResponse.json(
        { error: 'description is required' },
        { status: 400 }
      )
    }

    if (body.description.trim().length < 10) {
      return NextResponse.json(
        { error: 'Please provide a more detailed description (at least 10 characters)' },
        { status: 400 }
      )
    }

    // Forward to backend — include Authorization header if present
    const authHeader = request.headers.get('authorization') || ''

    const backendRes = await fetch(`${BACKEND}/api/v1/copilot/generate-config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify({ description: body.description }),
    })

    if (!backendRes.ok) {
      const errText = await backendRes.text().catch(() => 'Unknown error')
      console.error('[generate-config] Backend error:', backendRes.status, errText)
      return NextResponse.json(
        { error: 'Config generation failed', detail: errText },
        { status: backendRes.status }
      )
    }

    const data = await backendRes.json()
    return NextResponse.json(data)
  } catch (err) {
    console.error('[generate-config] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal error', detail: String(err) },
      { status: 500 }
    )
  }
}
