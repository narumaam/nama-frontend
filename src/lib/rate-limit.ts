/**
 * NAMA OS — In-Memory Rate Limiter
 * ──────────────────────────────────
 * Zero-cost, zero-dependency sliding window rate limiter.
 * Runs in the same Node.js process as the route handler.
 *
 * Limitations (acceptable for MVP):
 * - State is per-instance (not shared across Vercel serverless instances)
 * - Resets on cold start
 * For production scale: replace the store with Upstash Redis (@upstash/ratelimit)
 * — same API surface, just swap the store. Migration: 2 hours, zero code change.
 *
 * Defaults:
 *   /api/v1/intelligence/*  →  20 req / 60s per IP  (machine-to-machine sync)
 *   /api/v1/context/*       →  60 req / 60s per IP  (browser calls on every nav)
 *   /api/auth/*             →  10 req / 60s per IP  (login/cookie endpoints)
 */

import { NextRequest, NextResponse } from 'next/server';

interface WindowEntry {
  count: number;
  resetAt: number;
}

// Shared in-process store — one Map per route limit config
const stores = new Map<string, Map<string, WindowEntry>>();

function getStore(storeKey: string): Map<string, WindowEntry> {
  if (!stores.has(storeKey)) stores.set(storeKey, new Map());
  return stores.get(storeKey)!;
}

export interface RateLimitConfig {
  /** Number of requests allowed in the window */
  limit: number;
  /** Window duration in milliseconds */
  windowMs: number;
  /** Unique key for this limiter (separates limits per-route) */
  storeKey: string;
}

export const RATE_LIMITS = {
  intelligence: { limit: 20, windowMs: 60_000, storeKey: 'intelligence' },
  context:      { limit: 60, windowMs: 60_000, storeKey: 'context' },
  auth:         { limit: 10, windowMs: 60_000, storeKey: 'auth' },
} as const satisfies Record<string, RateLimitConfig>;

/**
 * Returns a 429 NextResponse if the caller is rate limited, otherwise null.
 * Identifies callers by IP (falls back to a shared bucket in development).
 */
export function rateLimit(
  request: NextRequest,
  config: RateLimitConfig
): NextResponse | null {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    '127.0.0.1';

  const store = getStore(config.storeKey);
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || entry.resetAt <= now) {
    // New window
    store.set(ip, { count: 1, resetAt: now + config.windowMs });
    return null; // allowed
  }

  if (entry.count >= config.limit) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    return NextResponse.json(
      {
        success: false,
        error: 'Rate limit exceeded',
        retry_after_seconds: retryAfterSec,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSec),
          'X-RateLimit-Limit': String(config.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(entry.resetAt / 1000)),
        },
      }
    );
  }

  entry.count += 1;
  return null; // allowed
}

/**
 * Cleanup: prune expired entries from all stores.
 * Call this occasionally to prevent memory growth.
 * In production with Redis this is unnecessary — Redis handles TTL.
 */
export function pruneExpiredEntries(): void {
  const now = Date.now();
  for (const store of stores.values()) {
    for (const [ip, entry] of store.entries()) {
      if (entry.resetAt <= now) store.delete(ip);
    }
  }
}
