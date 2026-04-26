"""
Idempotency key middleware — Tier 8E.

Lightweight in-memory implementation. Suitable for first-customer scale
(< 100 concurrent users on a single Railway replica). For multi-replica
scale we'll move to Redis-backed storage; the API of this module is shaped
so the swap is transparent.

How callers use it:
    @router.post("/leads/", ...)
    def create_lead(body, request: Request, ...):
        key = request.headers.get("Idempotency-Key", "")
        if key:
            cached = idempotency_store.get(tenant_id, "leads.create", key)
            if cached is not None:
                return cached
        # ... do the work ...
        if key:
            idempotency_store.set(tenant_id, "leads.create", key, response)
        return response

A network glitch + retry with the same Idempotency-Key returns the cached
prior response instead of creating a duplicate row.
"""

from __future__ import annotations
from typing import Any, Dict, Optional, Tuple
from datetime import datetime, timezone, timedelta
import threading


# Simple LRU-ish dict with TTL. Single-process. Single-replica safe.
class _IdempotencyStore:
    def __init__(self, ttl_hours: int = 24, max_entries: int = 10_000):
        self._data: Dict[Tuple[int, str, str], Tuple[Any, datetime]] = {}
        self._lock = threading.Lock()
        self._ttl = timedelta(hours=ttl_hours)
        self._max_entries = max_entries

    def _key(self, tenant_id: int, scope: str, idem_key: str) -> Tuple[int, str, str]:
        return (tenant_id, scope, idem_key)

    def get(self, tenant_id: int, scope: str, idem_key: str) -> Optional[Any]:
        if not idem_key:
            return None
        with self._lock:
            cached = self._data.get(self._key(tenant_id, scope, idem_key))
            if cached is None:
                return None
            value, expiry = cached
            if datetime.now(timezone.utc) > expiry:
                # Expired — clean up and miss
                self._data.pop(self._key(tenant_id, scope, idem_key), None)
                return None
            return value

    def set(self, tenant_id: int, scope: str, idem_key: str, value: Any) -> None:
        if not idem_key:
            return
        with self._lock:
            # Evict oldest if at capacity (FIFO is good enough for this use case)
            if len(self._data) >= self._max_entries:
                # Drop the 100 oldest entries
                items = list(self._data.items())
                items.sort(key=lambda kv: kv[1][1])
                for k, _ in items[:100]:
                    self._data.pop(k, None)
            expiry = datetime.now(timezone.utc) + self._ttl
            self._data[self._key(tenant_id, scope, idem_key)] = (value, expiry)


# Module-level singleton — shared across all routes within one Python process.
idempotency_store = _IdempotencyStore()
