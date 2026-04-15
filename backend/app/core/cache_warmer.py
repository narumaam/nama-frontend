"""
Cache Pre-Warmer
================
Populates the distributed cache for all active tenants before traffic hits.
Called at server startup and can be triggered via admin endpoint.

Prevents the "cache cold start" thundering herd where all users simultaneously
hit the database when the cache is empty. This was the root cause of the 99.6% error
rate during the 50K concurrent user stress test.

Architecture:
  - warm_tenant_cache(): Caches dashboard, anomalies, and forecast for one tenant
  - warm_all_tenants(): Queries all active tenants and warms each one
  - start_background_warmer(): Runs warm_all_tenants in a daemon thread (non-blocking)
"""

import logging
import threading
from typing import Dict

log = logging.getLogger(__name__)


def warm_tenant_cache(tenant_id: int, db_session) -> Dict[str, str]:
    """
    Warm all analytics cache entries for a single tenant.

    Args:
        tenant_id: The tenant to warm cache for
        db_session: SQLAlchemy session to query from

    Returns:
        Dictionary with keys "dashboard", "anomalies", "forecast" and status values
    """
    from app.agents.analytics import AnalyticsAgent
    from app.core.redis_cache import distributed_cache

    agent = AnalyticsAgent()
    results = {}

    # Warm dashboard cache (30-second TTL)
    try:
        dashboard = agent.generate_dashboard_summary(db_session, tenant_id)
        distributed_cache.set(f"dashboard:{tenant_id}", dashboard, ttl_seconds=30)
        results["dashboard"] = "OK"
    except Exception as e:
        results["dashboard"] = f"ERROR: {e}"
        log.warning("Cache warm dashboard tenant=%s: %s", tenant_id, e)

    # Warm anomalies cache (60-second TTL)
    try:
        anomalies = agent.detect_anomalies(db_session, tenant_id)
        distributed_cache.set(f"anomalies:{tenant_id}", anomalies, ttl_seconds=60)
        results["anomalies"] = "OK"
    except Exception as e:
        results["anomalies"] = f"ERROR: {e}"
        log.warning("Cache warm anomalies tenant=%s: %s", tenant_id, e)

    # Warm forecast cache (300-second/5-minute TTL)
    try:
        forecast = agent.generate_forecast(db_session, tenant_id)
        distributed_cache.set(f"forecast:{tenant_id}", forecast, ttl_seconds=300)
        results["forecast"] = "OK"
    except Exception as e:
        results["forecast"] = f"ERROR: {e}"
        log.warning("Cache warm forecast tenant=%s: %s", tenant_id, e)

    return results


def warm_all_tenants(engine=None) -> Dict:
    """
    Warm cache for all active tenants.

    This function:
      1. Queries for all active tenants from the Tenant model
      2. Calls warm_tenant_cache() for each one
      3. Logs the overall result

    Typically run in a background thread to avoid blocking server startup.

    Args:
        engine: Optional SQLAlchemy engine (unused, for future extensibility)

    Returns:
        Dictionary mapping tenant_id -> warm_tenant_cache result dict
    """
    from app.db.session import SessionLocal
    from app.models.auth import Tenant

    summary = {}
    db = SessionLocal()
    try:
        tenants = db.query(Tenant).filter(Tenant.status == "active").all()
        if not tenants:  # fallback: warm all tenants regardless of status
            tenants = db.query(Tenant).all()
        log.info("Cache pre-warmer: warming %d tenants", len(tenants))

        for tenant in tenants:
            summary[tenant.id] = warm_tenant_cache(tenant.id, db)

        log.info("Cache pre-warmer complete: %s", summary)
    except Exception as e:
        log.error("Cache pre-warmer failed: %s", e)
    finally:
        db.close()

    return summary


def start_background_warmer():
    """
    Start cache warming in a background daemon thread.

    This is non-blocking: the server startup continues immediately while
    the warmer runs in the background. All 50K+ concurrent users will not
    hit the DB at once because cache will be pre-populated.
    """
    t = threading.Thread(
        target=warm_all_tenants,
        daemon=True,
        name="cache-warmer"
    )
    t.start()
    log.info("Cache pre-warmer started in background thread")
