"""
Redis-backed distributed cache. Falls back gracefully to in-process cache
if Redis is unavailable (dev without Redis, test environments).
"""
import json
import os
import logging
from typing import Any, Optional
import redis
from app.core.cache import TTLCache  # in-process fallback

log = logging.getLogger(__name__)
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")


class RedisCache:
    def __init__(self):
        self._redis: Optional[redis.Redis] = None
        self._fallback = TTLCache()
        self._available = False
        self._try_connect()

    def _try_connect(self):
        # 1. Try real Redis first
        try:
            r = redis.from_url(
                REDIS_URL,
                socket_connect_timeout=1,
                socket_timeout=1,
                decode_responses=True,
            )
            r.ping()
            self._redis = r
            self._available = True
            log.info("Redis cache: connected at %s", REDIS_URL)
            return
        except Exception as e:
            log.warning("Redis unavailable (%s) — trying fakeredis", e)

        # 2. Fall back to fakeredis (in-process, no external dependency)
        try:
            import fakeredis
            self._redis = fakeredis.FakeRedis(decode_responses=True)
            self._available = True
            log.info("Redis cache: using fakeredis (in-process, shared within worker)")
        except ImportError:
            log.warning("fakeredis not installed — using TTLCache fallback")
            self._available = False

    def get(self, key: str) -> Optional[Any]:
        if self._available and self._redis:
            try:
                val = self._redis.get(key)
                return json.loads(val) if val else None
            except Exception:
                self._available = False
        return self._fallback.get(key)

    def set(self, key: str, value: Any, ttl_seconds: float = 30):
        if self._available and self._redis:
            try:
                self._redis.setex(key, int(ttl_seconds), json.dumps(value, default=str))
                return
            except Exception:
                self._available = False
        self._fallback.set(key, value, ttl_seconds)

    def delete(self, key: str):
        if self._available and self._redis:
            try:
                self._redis.delete(key)
            except Exception:
                pass
        self._fallback.invalidate_tenant(0)  # best effort

    def invalidate_pattern(self, pattern: str):
        if self._available and self._redis:
            try:
                keys = self._redis.keys(pattern)
                if keys:
                    self._redis.delete(*keys)
            except Exception:
                pass

    def stats(self) -> dict:
        return {
            "backend": "redis" if self._available else "in_process",
            "redis_url": REDIS_URL if self._available else None,
            **self._fallback.stats(),
        }


# Singleton
distributed_cache = RedisCache()
