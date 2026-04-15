"""
In-process LRU cache for read-heavy, tenant-scoped API responses.

Used for:
  - GET /analytics/dashboard   (30-second TTL)
  - GET /analytics/forecast    (5-minute TTL)
  - GET /ai/health             (10-second TTL)

Design:
  - Thread-safe using threading.Lock
  - Keyed by (tenant_id, endpoint) so tenants never see each other's data
  - TTL-based expiry (no Redis required for single-process deployments)
  - For multi-process / multi-instance: replace with Redis cache

For 5K–50K users:
  Analytics dashboard is the hottest read endpoint. Without caching, every
  request hits the DB with 5 COUNT/SUM queries. With 30s TTL, a burst of
  1,000 rps against /analytics/dashboard becomes 1 DB hit per 30s.
"""

import time
import threading
from typing import Any, Optional, Tuple
from functools import wraps


class TTLCache:
    """Thread-safe in-memory cache with per-entry TTL."""

    def __init__(self):
        self._store: dict[str, Tuple[Any, float]] = {}
        self._lock = threading.Lock()

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            value, expires_at = entry
            if time.monotonic() > expires_at:
                del self._store[key]
                return None
            return value

    def set(self, key: str, value: Any, ttl_seconds: float) -> None:
        with self._lock:
            self._store[key] = (value, time.monotonic() + ttl_seconds)

    def delete(self, key: str) -> None:
        with self._lock:
            self._store.pop(key, None)

    def invalidate_tenant(self, tenant_id: int) -> None:
        """Evict all entries for a given tenant (call on write operations)."""
        prefix = f"t{tenant_id}:"
        with self._lock:
            keys_to_delete = [k for k in self._store if k.startswith(prefix)]
            for k in keys_to_delete:
                del self._store[k]

    def stats(self) -> dict:
        with self._lock:
            now = time.monotonic()
            total = len(self._store)
            active = sum(1 for _, (_, exp) in self._store.items() if now <= exp)
            return {"total_entries": total, "active_entries": active, "expired_entries": total - active}


# Singleton cache instance
cache = TTLCache()


# ── TTL constants (seconds) ───────────────────────────────────────────────────
TTL_ANALYTICS_DASHBOARD = 30
TTL_ANALYTICS_FORECAST  = 300   # 5 minutes
TTL_AI_HEALTH           = 10
TTL_TENANT_LEADS_LIST   = 15    # light caching on list endpoints


def make_key(tenant_id: int, namespace: str, *args) -> str:
    """Build a cache key scoped to the tenant."""
    suffix = ":".join(str(a) for a in args) if args else ""
    return f"t{tenant_id}:{namespace}" + (f":{suffix}" if suffix else "")


# ── Response Caching Decorator ─────────────────────────────────────────────────
class ResponseCache:
    """
    Endpoint-level response cache decorator for async endpoints.
    Caches entire HTTP responses keyed by (path, tenant_id) with configurable TTL.

    Usage:
        @router.get("/items")
        @cache_response(ttl_seconds=30)
        async def list_items(
            db: AsyncSession = Depends(get_async_db),
            claims: dict = Depends(get_token_claims),
        ):
            ...
    """

    def __init__(self, ttl_seconds: float):
        self.ttl_seconds = ttl_seconds

    def __call__(self, func):
        """Wrap an async endpoint function with response caching."""
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract tenant_id from kwargs (passed via Depends(require_tenant) or claims)
            tenant_id = kwargs.get("tenant_id")
            if tenant_id is None:
                # Try to extract from claims dict if present
                claims = kwargs.get("claims")
                if claims and isinstance(claims, dict):
                    tenant_id = claims.get("tenant_id")

            # Build cache key from function name + tenant_id
            cache_key = f"response:{func.__name__}:t{tenant_id}" if tenant_id else None

            # Try cache hit
            if cache_key:
                cached = cache.get(cache_key)
                if cached is not None:
                    return cached

            # Cache miss: call the real endpoint
            result = await func(*args, **kwargs)

            # Cache the response (dict or list)
            if cache_key and result is not None:
                cache.set(cache_key, result, self.ttl_seconds)

            return result

        return wrapper


def cache_response(ttl_seconds: float):
    """
    Decorator factory to cache async endpoint responses.

    Args:
        ttl_seconds: Time-to-live for cached response in seconds.

    Returns:
        A decorator that wraps async endpoints.

    Example:
        @router.get("/dashboard")
        @cache_response(ttl_seconds=30)
        async def dashboard(tenant_id: int = Depends(require_tenant), ...):
            ...
    """
    return ResponseCache(ttl_seconds)
