"""
Redis-backed distributed cache using Upstash (HTTP-based).
Falls back gracefully to in-process cache only on transient errors.
Refuses to start if UPSTASH credentials are missing.
"""
import json
import os
import logging
from typing import Any, Optional
from upstash_redis import Redis
from app.core.cache import TTLCache  # in-process fallback

log = logging.getLogger(__name__)

# Retrieve credentials with loud failure at import/startup
URL = os.environ.get("UPSTASH_REDIS_REST_URL")
TOKEN = os.environ.get("UPSTASH_REDIS_REST_TOKEN")

if not URL or not TOKEN:
    log.error("CRITICAL: UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is not set.")
    # Fail loud at startup
    raise RuntimeError("Redis credentials (Upstash) are not configured. Refusing to start.")


class RedisCache:
    def __init__(self):
        # Initialise Upstash Redis (connectionless HTTP client)
        self._redis = Redis(url=URL, token=TOKEN)
        self._fallback = TTLCache()
        self._available = True
        log.info("Redis cache: initialised Upstash client at %s", URL)

    def get(self, key: str) -> Optional[Any]:
        if not self._available:
            return self._fallback.get(key)
            
        try:
            val = self._redis.get(key)
            return json.loads(val) if val else None
        except Exception as e:
            log.warning("Upstash Redis get error (%s) — using fallback", e)
            return self._fallback.get(key)

    def set(self, key: str, value: Any, ttl_seconds: float = 30):
        if not self._available:
            self._fallback.set(key, value, ttl_seconds)
            return

        try:
            # upstash-redis set(key, value, ex=seconds)
            self._redis.set(key, json.dumps(value, default=str), ex=int(ttl_seconds))
        except Exception as e:
            log.warning("Upstash Redis set error (%s) — using fallback", e)
            self._fallback.set(key, value, ttl_seconds)

    def delete(self, key: str):
        try:
            self._redis.delete(key)
        except Exception as e:
            log.debug("Upstash Redis delete error (%s)", e)
        self._fallback.invalidate_tenant(0)

    def invalidate_pattern(self, pattern: str):
        try:
            keys = self._redis.keys(pattern)
            if keys:
                self._redis.delete(*keys)
        except Exception as e:
            log.debug("Upstash Redis keys/delete error (%s)", e)

    def stats(self) -> dict:
        return {
            "backend": "upstash",
            "redis_url": URL,
            **self._fallback.stats(),
        }


# Singleton instance
distributed_cache = RedisCache()
