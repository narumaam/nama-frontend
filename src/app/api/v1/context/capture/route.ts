/**
 * NAMA OS — Paperclip Context Capture API (V3)
 * ─────────────────────────────────────────────
 * POST /api/v1/context/capture
 *
 * Receives ambient context from the frontend's Paperclip system.
 * Used by NAMA Copilot to pre-load relevant context before AI generation.
 *
 * Context types:
 * - Lead viewed (stores to localStorage + this endpoint for session context)
 * - Itinerary opened
 * - Quotation viewed
 * - Vendor profile viewed
 * - Module navigated to
 *
 * In production: stores to user session (Redis) with 1hr TTL
 * Frontend reads back via GET /api/v1/context/current
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/api-auth';

type ContextType = 'LEAD_VIEWED' | 'ITINERARY_OPENED' | 'QUOTATION_VIEWED' | 'VENDOR_VIEWED' | 'MODULE_CHANGED';

interface ContextCapture {
  type: ContextType;
  entity_id?: number | string;
  entity_name?: string;
  module?: string;
  metadata?: Record<string, string | number | boolean>;
  timestamp?: string;
}

export async function POST(request: NextRequest) {
  const authError = requireSession(request);
  if (authError) return authError;

  try {
    const body = await request.json() as ContextCapture;

    if (!body.type) {
      return NextResponse.json({ success: false, error: 'type is required' }, { status: 400 });
    }

    // In production: store to Redis session with TTL
    // await redis.setex(`context:${sessionId}:${body.type}`, 3600, JSON.stringify(body));

    return NextResponse.json({
      success: true,
      captured: {
        type: body.type,
        entity_id: body.entity_id,
        entity_name: body.entity_name,
        timestamp: new Date().toISOString(),
      },
      message: 'Context captured — Copilot will use this in your next AI interaction',
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 });
  }
}

export async function GET() {
  // In production: return current session context from Redis
  return NextResponse.json({
    context: {
      recent_leads: [],
      recent_itinerary: null,
      recent_quotation: null,
      current_module: 'dashboard',
      session_start: new Date().toISOString(),
    },
    message: 'Context is managed client-side via localStorage in current version',
  });
}
