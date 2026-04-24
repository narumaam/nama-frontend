/**
 * NAMA OS — Rate Limiter
 * ──────────────────────
 * Uses Upstash Redis when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 * are set (shared across all Vercel instances).
 * Falls back to in-memory sliding window when env vars are absent (local dev).
 *
 * Defaults:
 *   /api/v1/intelligence/*  →  20 req / 60s per IP
 *   /api/v1/context/*       →  60 req / 60s per IP
 *   /api/auth/*             →  10 req / 60s per IP
 */

import { NextRequest, NextResponse } from 'next/server';

// ─── Config ──────────────────────────────────────────────────────────────────

export interface RateLimitConfig {
  limit: number;
  windowMs: number;
  storeKey: string;
}

export const RATE_LIMITS = {
  intelligence: { limit: 20, windowMs: 60_000, storeKey: 'intelligence' },
  context:      { limit: 60, windowMs: 60_000, storeKey: 'context' },
  auth:         { limit: 10, windowMs: 60_000, storeKey: 'auth' },
} as const satisfies Record<string, RateLimitConfig>;

// ─── Upstash Redis (production) ───────────────────────────────────────────────

async function makeUpstashLimiter(config: RateLimitConfig) {
  const [{ Ratelimit }, { Redis }] = await Promise.all([
    import('@upstash/ratelimit'),
    import('@upstash/redis'),
  ]);

  const redis = new Redis({
    url:   process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.limit, `${config.windowMs / 1000} s`),
    prefix:  `nama:rl:${config.storeKey}`,
  });
}

// Cache limiter instances so we don't recreate them on every request
const upstashLimiters = new Map<string, Awaited<ReturnType<typeof makeUpstashLimiter>>>();

async function getUpstashLimiter(config: RateLimitConfig) {
  if (!upstashLimiters.has(config.storeKey)) {
    upstashLimiters.set(config.storeKey, await makeUpstashLimiter(config));
  }
  return upstashLimiters.get(config.storeKey)!;
}

// ─── In-memory fallback (local dev) ──────────────────────────────────────────

interface WindowEntry { count: number; resetAt: number }
const stores = new Map<string, Map<string, WindowEntry>>();

function getStore(key: string) {
  if (!stores.has(key)) stores.set(key, new Map());
  return stores.get(key)!;
}

function inMemoryRateLimit(ip: string, config: RateLimitConfig): boolean {
  const store = getStore(config.storeKey);
  const now   = Date.now();
  const entry = store.get(ip);

  if (!entry || entry.resetAt <= now) {
    store.set(ip, { count: 1, resetAt: now + config.windowMs });
    return true; // allowed
  }
  if (entry.count >= config.limit) return false; // blocked
  entry.count += 1;
  return true; // allowed
}

// ─── Public API ───────────────────────────────────────────────────────────────

function getIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    '127.0.0.1'
  );
}

function blockedResponse(retryAfterSec: number, config: RateLimitConfig): NextResponse {
  return NextResponse.json(
    { success: false, error: 'Rate limit exceeded', retry_after_seconds: retryAfterSec },
    {
      status: 429,
      headers: {
        'Retry-After':          String(retryAfterSec),
        'X-RateLimit-Limit':    String(config.limit),
        'X-RateLimit-Remaining': '0',
      },
    }
  );
}

/**
 * Returns a 429 NextResponse if the caller is rate limited, otherwise null.
 * Uses Upstash Redis when configured, in-memory otherwise.
 */
export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  const ip = getIp(request);

  const useUpstash =
    !!process.env.UPSTASH_REDIS_REST_URL &&
    !!process.env.UPSTASH_REDIS_REST_TOKEN;

  if (useUpstash) {
    try {
      const limiter = await getUpstashLimiter(config);
      const { success, reset } = await limiter.limit(ip);
      if (!success) {
        const retryAfter = Math.ceil((reset - Date.now()) / 1000);
        return blockedResponse(retryAfter, config);
      }
      return null;
    } catch (err) {
      // Redis unavailable — degrade gracefully to in-memory
      console.warn('[rateLimit] Upstash unavailable, falling back to in-memory:', err);
    }
  }

  // In-memory fallback
  const allowed = inMemoryRateLimit(ip, config);
  if (!allowed) {
    return blockedResponse(Math.ceil(config.windowMs / 1000), config);
  }
  return null;
}

/**
 * Cleanup for in-memory fallback only (Redis handles TTL automatically).
 */
export function pruneExpiredEntries(): void {
  const now = Date.now();
  for (const store of stores.values()) {
    for (const [ip, entry] of store.entries()) {
      if (entry.resetAt <= now) store.delete(ip);
    }
  }
}
