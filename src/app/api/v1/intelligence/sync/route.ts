/**
 * NAMA OS — Intelligence Sync API (V5 Foundation)
 * ─────────────────────────────────────────────────
 * POST /api/v1/intelligence/sync
 *
 * Receives anonymized demand intelligence from NAMA agency nodes
 * (local Gemma instances running at partner agencies).
 *
 * The Gemma Distributed Data Network:
 * 1. Agency runs a local OSS AI model (Gemma 2B) on their server
 * 2. Model processes their own query data locally — never leaves their server
 * 3. Each night at 2AM: anonymized aggregate signals are sent here
 * 4. NAMA central brain aggregates across all nodes → proprietary demand intelligence
 * 5. Enriched insights are sent back to all nodes next morning
 *
 * Payload Structure:
 * {
 *   node_id: string          — agency's unique node identifier (not their name)
 *   payload_version: string  — schema version for forward compatibility
 *   period: string           — "YYYY-MM-DD" the data covers
 *   signals: IntelSignal[]   — anonymized demand signals
 *   checksum: string         — HMAC-SHA256 of payload for integrity
 * }
 *
 * Each IntelSignal is fully anonymized:
 * - No client names, emails, phones
 * - No agency name
 * - Only behavioral patterns and aggregate trends
 *
 * This endpoint:
 * 1. Validates the payload structure and checksum
 * 2. Enriches with server-side metadata (received_at, geo_region)
 * 3. Stores to intelligence store (Neon PostgreSQL in production)
 * 4. Triggers central brain aggregation job (async)
 * 5. Returns the latest aggregated insights for the node to consume
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/lib/api-auth';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

// ─── Types ────────────────────────────────────────────────────────────────────

interface IntelSignal {
  signal_type: 'DESTINATION_DEMAND' | 'BUDGET_RANGE' | 'TRAVEL_STYLE' | 'LEAD_VELOCITY' | 'SEASON_INTENT';
  destination?: string;       // anonymized to region-level only (e.g. "South-East Asia" not "Bali")
  budget_tier?: 'BUDGET' | 'MID' | 'PREMIUM' | 'LUXURY';
  travel_style?: string;
  count: number;              // number of inquiries in this bucket
  avg_confidence?: number;    // average triage confidence (0-100)
  conversion_rate?: number;   // local conversion rate for this signal (0-1)
  period_week?: number;       // ISO week number
}

interface SyncPayload {
  node_id: string;
  payload_version: string;
  period: string;
  region?: string;            // broad geographic region of the agency (not exact location)
  signals: IntelSignal[];
  metadata?: {
    total_leads_processed: number;
    model_version: string;
    sync_type: 'NIGHTLY' | 'MANUAL' | 'REALTIME';
  };
  checksum?: string;
}

interface AggregatedInsight {
  category: string;
  insight: string;
  confidence: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  actionable: string;
}

// ─── Mock Intelligence Store ──────────────────────────────────────────────────
// In production: Neon PostgreSQL with pgvector for semantic search

const MOCK_AGGREGATED_INSIGHTS: AggregatedInsight[] = [
  {
    category: 'DESTINATION_DEMAND',
    insight: 'Maldives overwater villa inquiries up 34% vs same period last year across all NAMA nodes. Premium segment leading the surge.',
    confidence: 87,
    trend: 'UP',
    actionable: 'Increase Maldives package inventory. Pre-negotiate 2025 allotments with Conrad, Soneva, Cheval Blanc.',
  },
  {
    category: 'BUDGET_RANGE',
    insight: 'LUXURY tier inquiries (>₹2L/pax) growing at 2x rate vs MID tier. Indicates premiumization trend in Indian outbound travel.',
    confidence: 82,
    trend: 'UP',
    actionable: 'Create dedicated luxury product line. Train agents on value-selling. Develop luxury-only WhatsApp catalog.',
  },
  {
    category: 'TRAVEL_STYLE',
    insight: 'Honeymoon + Anniversary segments combined now represent 41% of all qualified leads — highest ever recorded.',
    confidence: 91,
    trend: 'UP',
    actionable: 'Build honeymoon-specific packages for top 5 destinations. Partner with wedding photographers & planners.',
  },
  {
    category: 'LEAD_VELOCITY',
    insight: 'Average time-to-qualify dropped to 2.3 days (from 4.1 days). AI triage adoption improving response speed across nodes.',
    confidence: 78,
    trend: 'UP',
    actionable: 'Maintain AI triage adoption. Identify nodes with >5 day qualify time for coaching.',
  },
  {
    category: 'SEASON_INTENT',
    insight: 'Dec-Jan peak booking window opening 3 weeks earlier than previous years. Southeast Asia, Maldives, Europe leading.',
    confidence: 85,
    trend: 'STABLE',
    actionable: 'Launch early-bird campaigns in September. Lock in Q4 inventory commitments by August.',
  },
];

// ─── Validation ───────────────────────────────────────────────────────────────

function validatePayload(body: unknown): { valid: boolean; error?: string } {
  if (!body || typeof body !== 'object') return { valid: false, error: 'Payload must be a JSON object' };
  const payload = body as Partial<SyncPayload>;

  if (!payload.node_id || typeof payload.node_id !== 'string') return { valid: false, error: 'node_id is required' };
  if (!payload.payload_version) return { valid: false, error: 'payload_version is required' };
  if (!payload.period || !/^\d{4}-\d{2}-\d{2}$/.test(payload.period)) return { valid: false, error: 'period must be YYYY-MM-DD format' };
  if (!Array.isArray(payload.signals) || payload.signals.length === 0) return { valid: false, error: 'signals array must be non-empty' };
  if (payload.signals.length > 500) return { valid: false, error: 'signals array exceeds maximum of 500 entries' };

  // Validate each signal
  const validTypes = ['DESTINATION_DEMAND', 'BUDGET_RANGE', 'TRAVEL_STYLE', 'LEAD_VELOCITY', 'SEASON_INTENT'];
  for (const [i, sig] of payload.signals.entries()) {
    if (!validTypes.includes(sig.signal_type)) {
      return { valid: false, error: `Signal [${i}]: invalid signal_type "${sig.signal_type}"` };
    }
    if (typeof sig.count !== 'number' || sig.count < 0) {
      return { valid: false, error: `Signal [${i}]: count must be a non-negative number` };
    }
    // Privacy guard: ensure no PII fields sneak through
    const sigKeys = Object.keys(sig);
    const allowedKeys = ['signal_type', 'destination', 'budget_tier', 'travel_style', 'count', 'avg_confidence', 'conversion_rate', 'period_week'];
    const piiKeys = sigKeys.filter(k => !allowedKeys.includes(k));
    if (piiKeys.length > 0) {
      return { valid: false, error: `Signal [${i}]: unexpected fields detected (${piiKeys.join(', ')}) — remove before syncing` };
    }
  }

  return { valid: true };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const rateLimitError = await rateLimit(request, RATE_LIMITS.intelligence);
  if (rateLimitError) return rateLimitError;
  const authError = requireApiKey(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const validation = validatePayload(body);

    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const payload = body as SyncPayload;
    const receivedAt = new Date().toISOString();

    // In production:
    // 1. Verify HMAC-SHA256 checksum against node's registered secret
    // 2. Upsert signals to intelligence_signals table in Neon
    // 3. Trigger async aggregation job via queue (Inngest / Trigger.dev)
    // 4. Update node's last_sync_at timestamp

    // For now: acknowledge receipt and return aggregated insights
    const response = {
      success: true,
      received_at: receivedAt,
      node_id: payload.node_id,
      period: payload.period,
      signals_ingested: payload.signals.length,
      sync_id: `sync_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,

      // Return latest aggregated insights for this node to consume
      insights: MOCK_AGGREGATED_INSIGHTS,

      // Network stats (anonymized aggregate across all nodes)
      network_stats: {
        active_nodes: 12,
        signals_this_week: 4821,
        avg_lead_velocity_days: 2.3,
        top_destinations: ['Maldives', 'Bali', 'Dubai', 'Europe', 'Rajasthan'],
        demand_trend: 'BULLISH',
        last_aggregated: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
      },

      // Instructions for next sync
      next_sync: {
        recommended_at: new Date(Date.now() + 23 * 3600 * 1000).toISOString(),
        send_signals: ['DESTINATION_DEMAND', 'BUDGET_RANGE', 'LEAD_VELOCITY'],
        schema_version: '1.0',
      },
    };

    return NextResponse.json(response, { status: 200 });

  } catch (err) {
    console.error('[intelligence/sync] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ─── GET: Health check ────────────────────────────────────────────────────────

export async function GET() {
  return NextResponse.json({
    service: 'NAMA Intelligence Sync API',
    version: '1.0.0',
    status: 'operational',
    network: {
      active_nodes: 12,
      last_sync: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    },
    endpoints: {
      sync: 'POST /api/v1/intelligence/sync',
      aggregate: 'GET /api/v1/intelligence/aggregate',
    },
    documentation: 'https://docs.nama.travel/intelligence-network',
  });
}
