"""
Per-Tenant API Rate Limiter
============================
Sliding window rate limiting keyed by tenant_id + endpoint group + time bucket.
Uses the distributed cache (Redis → fakeredis → TTLCache) as the counter store.

Limits (per tenant per minute):
  AI endpoints:        60   req/min  (expensive inference)
  Analytics endpoints: 120  req/min  (cached; limit DB pressure)
  Write operations:    300  req/min  (POST/PUT/DELETE)
  Read operations:     600  req/min  (GET)
  Webhook ingestion:   1000 req/min  (machine traffic, high volume)
"""
import time
import logging
from typing import Tuple

log = logging.getLogger(__name__)

RATE_LIMITS = {
    "ai":        60,
    "analytics": 120,
    "write":     300,
    "read":      600,
    "webhook":   1000,
    "default":   600,
}


def _get_endpoint_group(path: str, method: str) -> str:
    """Classify endpoint into a rate limit group based on path and method."""
    if "/ai/" in path:
        return "ai"
    if "/analytics/" in path:
        return "analytics"
    if "/whatsapp-webhook" in path or "/webhook" in path:
        return "webhook"
    if method in ("POST", "PUT", "PATCH", "DELETE"):
        return "write"
    return "read"


def _get_minute_bucket() -> int:
    """Return the current minute bucket (unix timestamp // 60)."""
    return int(time.time() // 60)


def check_rate_limit(tenant_id: int, path: str, method: str) -> Tuple[bool, int, int]:
    """
    Check if the request is within rate limits.
    Returns (allowed, current_count, limit).

    Args:
        tenant_id: Tenant ID from JWT claims
        path: Request URL path
        method: HTTP method (GET, POST, etc.)

    Returns:
        Tuple[bool, int, int]: (allowed, current_count, limit)
    """
    from app.core.redis_cache import distributed_cache

    group = _get_endpoint_group(path, method)
    limit = RATE_LIMITS.get(group, RATE_LIMITS["default"])
    bucket = _get_minute_bucket()
    cache_key = f"rl:{tenant_id}:{group}:{bucket}"

    # Get current counter
    current = distributed_cache.get(cache_key)
    if current is None:
        current = 0

    # Handle string values (from Redis JSON parsing)
    if isinstance(current, str):
        try:
            current = int(current)
        except (ValueError, TypeError):
            current = 0

    # Check if limit exceeded
    if current >= limit:
        return False, current, limit

    # Increment counter (TTL = 70s so bucket expires naturally)
    distributed_cache.set(cache_key, current + 1, ttl_seconds=70)
    return True, current + 1, limit


class RateLimitMiddleware:
    """
    FastAPI/Starlette middleware that enforces per-tenant rate limits.

    Skips rate limiting for:
      - /health endpoints (monitoring)
      - /perf endpoint (lightweight probe)
      - Unauthenticated requests (let auth middleware handle those)
      - Documentation endpoints (/docs, /openapi.json)
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        """
        ASGI middleware entry point.
        Only processes HTTP requests; passes through WebSocket, lifespan, etc.
        """
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        from starlette.requests import Request
        from starlette.responses import JSONResponse

        request = Request(scope, receive)
        path = request.url.path
        method = request.method

        # Skip rate limiting for health/perf probes and documentation
        if path in ("/api/v1/health", "/api/v1/perf", "/", "/docs", "/openapi.json", "/api/docs", "/api/redoc"):
            await self.app(scope, receive, send)
            return

        # Extract tenant_id from JWT without full auth (best-effort)
        tenant_id = None
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            try:
                from app.core.security import decode_access_token
                claims = decode_access_token(auth_header[7:])
                tenant_id = claims.get("tenant_id")
            except Exception:
                # Invalid token; let auth middleware reject
                pass

        # If no tenant (unauthenticated), skip (auth middleware will reject)
        if not tenant_id:
            await self.app(scope, receive, send)
            return

        # Check rate limit
        allowed, count, limit = check_rate_limit(int(tenant_id), path, method)

        if not allowed:
            group = _get_endpoint_group(path, method)
            retry_after = 60 - (int(time.time()) % 60)

            response = JSONResponse(
                status_code=429,
                content={
                    "detail": f"Rate limit exceeded: {limit} requests/minute for {group} endpoints",
                    "retry_after": retry_after,
                },
                headers={
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(time.time()) + retry_after),
                    "Retry-After": str(retry_after),
                }
            )
            await response(scope, receive, send)
            return

        # Pass through to the app
        await self.app(scope, receive, send)
