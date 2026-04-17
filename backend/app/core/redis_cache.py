"""
Redis-backed distributed cache using Upstash (HTTP-based).
Falls back gracefully to in-process TTLCache when Redis is unavailable
or when UPSTASH credentials are not configured (e.g. dev / single-replica).
"""
import json
import os
import logging
from typing import Any, Optional
from app.core.cache import TTLCache  # in-process fallback

log = logging.getLogger(__name__)

# Credentials are optional — missing means in-process-only mode.
URL = os.environ.get("UPSTASH_REDIS_REST_URL")
TOKEN = os.environ.get("UPSTASH_REDIS_REST_TOKEN")

if not URL or not TOKEN:
    log.warning(
        "UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set — "
        "running in-process cache only (fine for single-replica deployments)."
    )


class RedisCache:
    def __init__(self):
        self._fallback = TTLCache()
        self._redis = None
        self._available = False

        if URL and TOKEN:
            try:
                from upstash_redis import Redis
                self._redis = Redis(url=URL, token=TOKEN)
                self._available = True
                log.info("Redis cache: initialised Upstash client at %s", URL)
            except Exception as e:
                log.warning("Failed to init Upstash Redis (%s) — using in-process cache only", e)
        else:
            log.info("Redis cache: no Upstash credentials — using in-process TTLCache only.")

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
            self._redis.set(key, json.dumps(value, default=str), ex=int(ttl_seconds))
        except Exception as e:
            log.warning("Upstash Redis set error (%s) — using fallback", e)
            self._fallback.set(key, value, ttl_seconds)

    def delete(self, key: str):
        if self._available:
            try:
                self._redis.delete(key)
            except Exception as e:
                log.debug("Upstash Redis delete error (%s)", e)
        self._fallback.invalidate_tenant(0)

    def invalidate_pattern(self, pattern: str):
        if self._available:
            try:
                keys = self._redis.keys(pattern)
                if keys:
                    self._redis.delete(*keys)
            except Exception as e:
                log.debug("Upstash Redis keys/delete error (%s)", e)

    def stats(self) -> dict:
        return {
            "backend": "upstash" if self._available else "in-process",
            "redis_url": URL or "not-configured",
            **self._fallback.stats(),
        }


# Singleton instance
distributed_cache = RedisCache()
