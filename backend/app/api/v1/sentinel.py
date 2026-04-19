"""
NAMA Infrastructure Sentinel — Usage monitoring + threshold alerts
===================================================================
Watches Vercel, Railway, and Neon Postgres usage against configurable
thresholds and sends email alerts when limits are approached.

NOTE: No new DB tables required — all state is stored in tenant.settings JSONB:
  - tenant.settings["sentinel_config"]   — threshold + notification config
  - tenant.settings["sentinel_api_keys"] — API credentials (plaintext, TODO: encrypt with Fernet)
  - tenant.settings["sentinel_alerts"]   — FIFO alert history (max 50 items)

Registration (add to main.py after calendar_reminders):
  # app.include_router(sentinel_router.router, prefix="/api/v1/sentinel", tags=["sentinel"])
"""

import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.v1.deps import require_tenant, get_token_claims
from app.models.auth import Tenant

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Constants ──────────────────────────────────────────────────────────────────
MAX_ALERT_HISTORY = 50
NEON_FREE_STORAGE_BYTES = 512 * 1024 * 1024    # 512 MB
NEON_FREE_COMPUTE_SECONDS = 191.9 * 3600       # 191.9 compute hours/month
RAILWAY_DEFAULT_LIMIT_DOLLARS = 20.0           # Pro tier soft limit
HTTPX_TIMEOUT = 10.0


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class SentinelServiceConfig(BaseModel):
    enabled: bool = True


class SentinelConfig(BaseModel):
    warn_pct: int = 50
    alert_pct: int = 70
    alert_email: str = ""
    vercel: SentinelServiceConfig = SentinelServiceConfig()
    railway: SentinelServiceConfig = SentinelServiceConfig()
    neon: SentinelServiceConfig = SentinelServiceConfig()


class SentinelApiKeys(BaseModel):
    # TODO: encrypt these with Fernet before storage in production
    vercel_api_token: str = ""
    vercel_team_id: str = ""
    railway_api_token: str = ""
    neon_api_key: str = ""
    neon_project_id: str = ""


class SentinelConfigSaveRequest(BaseModel):
    config: SentinelConfig
    api_keys: Optional[SentinelApiKeys] = None


# ── Usage fetchers (best-effort, never raise) ─────────────────────────────────

def _fetch_vercel_usage(api_token: str, team_id: str) -> Dict[str, Any]:
    """
    GET https://api.vercel.com/v2/teams/{team_id}/usage
    Returns bandwidth + edge requests + serverless compute metrics.
    Never raises — returns error dict on failure.
    """
    if not api_token or not team_id:
        return {"error": "missing_credentials", "pct_bandwidth": None, "pct_compute": None}

    try:
        url = f"https://api.vercel.com/v2/teams/{team_id}/usage"
        headers = {"Authorization": f"Bearer {api_token}"}
        resp = httpx.get(url, headers=headers, timeout=HTTPX_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()

        # Parse Vercel usage shape — handles both v2 and v1 response formats
        bandwidth_used = 0.0
        bandwidth_limit = 1024.0  # 1 TB default Pro limit (GB)
        compute_used = 0.0
        compute_limit = 1000.0   # 1000 GB-hours Pro default

        # v2 shape: data.analytics.bandwidth, data.analytics.serverlessFunctionExecution
        analytics = data.get("analytics") or data.get("usage") or {}

        if analytics:
            bw = analytics.get("bandwidth") or analytics.get("bandwidthInBytes") or {}
            if isinstance(bw, dict):
                bandwidth_used = float(bw.get("used", 0) or bw.get("current", 0)) / (1024 ** 3)
                bandwidth_limit = float(bw.get("limit", bandwidth_limit * 1024 ** 3) or (bandwidth_limit * 1024 ** 3)) / (1024 ** 3)
            elif isinstance(bw, (int, float)):
                bandwidth_used = float(bw) / (1024 ** 3)

            sf = analytics.get("serverlessFunctionExecution") or analytics.get("compute") or {}
            if isinstance(sf, dict):
                compute_used = float(sf.get("used", 0) or sf.get("current", 0)) / (1024 * 3600)
                compute_limit_raw = sf.get("limit", compute_limit * 1024 * 3600)
                compute_limit = float(compute_limit_raw or (compute_limit * 1024 * 3600)) / (1024 * 3600)

        edge_requests = 0
        er = analytics.get("edgeRequests") or analytics.get("edgeFunctionExecutions") or {}
        if isinstance(er, dict):
            edge_requests = int(er.get("used", 0) or er.get("current", 0))

        pct_bandwidth = round(min((bandwidth_used / bandwidth_limit) * 100, 100), 1) if bandwidth_limit > 0 else None
        pct_compute = round(min((compute_used / compute_limit) * 100, 100), 1) if compute_limit > 0 else None

        return {
            "bandwidth_used_gb": round(bandwidth_used, 3),
            "bandwidth_limit_gb": round(bandwidth_limit, 1),
            "edge_requests_used": edge_requests,
            "serverless_gb_hours_used": round(compute_used, 2),
            "serverless_gb_hours_limit": round(compute_limit, 1),
            "pct_bandwidth": pct_bandwidth,
            "pct_compute": pct_compute,
        }

    except httpx.HTTPStatusError as e:
        return {"error": f"http_{e.response.status_code}", "pct_bandwidth": None, "pct_compute": None}
    except Exception as e:
        return {"error": str(e)[:120], "pct_bandwidth": None, "pct_compute": None}


def _fetch_railway_usage(api_token: str) -> Dict[str, Any]:
    """
    POST https://backboard.railway.app/graphql/v2
    Queries estimated usage in dollars. Railway free: $5/mo, Pro: $20 soft.
    Never raises — returns error dict on failure.
    """
    if not api_token:
        return {"error": "missing_credentials", "pct_cost": None}

    query = """
    {
      me {
        usage {
          estimatedUsage {
            dollars
          }
        }
        projects {
          edges {
            node {
              usage {
                estimatedUsage {
                  dollars
                }
              }
            }
          }
        }
      }
    }
    """

    try:
        resp = httpx.post(
            "https://backboard.railway.app/graphql/v2",
            json={"query": query},
            headers={"Authorization": f"Bearer {api_token}", "Content-Type": "application/json"},
            timeout=HTTPX_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()

        me = (data.get("data") or {}).get("me") or {}
        usage_obj = (me.get("usage") or {}).get("estimatedUsage") or {}
        cost_dollars = float(usage_obj.get("dollars", 0) or 0)

        # Sum project-level usage as cross-check
        projects = (me.get("projects") or {}).get("edges") or []
        project_total = sum(
            float(((p.get("node") or {}).get("usage") or {}).get("estimatedUsage", {}).get("dollars", 0) or 0)
            for p in projects
        )
        # Use the higher value for conservative reporting
        cost_dollars = max(cost_dollars, project_total)

        limit_dollars = RAILWAY_DEFAULT_LIMIT_DOLLARS
        pct_cost = round(min((cost_dollars / limit_dollars) * 100, 100), 1) if limit_dollars > 0 else None

        return {
            "cost_dollars": round(cost_dollars, 4),
            "limit_dollars": limit_dollars,
            "pct_cost": pct_cost,
        }

    except httpx.HTTPStatusError as e:
        return {"error": f"http_{e.response.status_code}", "pct_cost": None}
    except Exception as e:
        return {"error": str(e)[:120], "pct_cost": None}


def _fetch_neon_usage(api_key: str, project_id: str) -> Dict[str, Any]:
    """
    GET https://console.neon.tech/api/v2/projects/{project_id}
    Returns storage and compute time usage against free-tier limits.
    Never raises — returns error dict on failure.
    """
    if not api_key or not project_id:
        return {"error": "missing_credentials", "pct_storage": None, "pct_compute": None}

    try:
        url = f"https://console.neon.tech/api/v2/projects/{project_id}"
        headers = {"Authorization": f"Bearer {api_key}"}
        resp = httpx.get(url, headers=headers, timeout=HTTPX_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()

        project = data.get("project") or data
        usage = project.get("usage") or {}

        # Storage
        storage_used = float(usage.get("storage_bytes_hour", 0) or usage.get("storage_bytes", 0) or 0)
        # storage_bytes_hour is a rolling metric; treat as current bytes used
        storage_limit = float(project.get("storage_limit_bytes") or NEON_FREE_STORAGE_BYTES)
        if storage_limit == 0:
            storage_limit = NEON_FREE_STORAGE_BYTES

        # Compute time
        compute_used_seconds = float(usage.get("compute_time_seconds", 0) or 0)
        compute_limit_seconds = float(project.get("compute_time_seconds_limit") or NEON_FREE_COMPUTE_SECONDS)
        if compute_limit_seconds == 0:
            compute_limit_seconds = NEON_FREE_COMPUTE_SECONDS

        pct_storage = round(min((storage_used / storage_limit) * 100, 100), 1) if storage_limit > 0 else None
        pct_compute = round(min((compute_used_seconds / compute_limit_seconds) * 100, 100), 1) if compute_limit_seconds > 0 else None

        return {
            "storage_bytes_used": int(storage_used),
            "storage_limit_bytes": int(storage_limit),
            "compute_time_seconds": int(compute_used_seconds),
            "compute_limit_seconds": int(compute_limit_seconds),
            "pct_storage": pct_storage,
            "pct_compute": pct_compute,
        }

    except httpx.HTTPStatusError as e:
        return {"error": f"http_{e.response.status_code}", "pct_storage": None, "pct_compute": None}
    except Exception as e:
        return {"error": str(e)[:120], "pct_storage": None, "pct_compute": None}


# ── Email alert (best-effort, never raise) ────────────────────────────────────

def _send_sentinel_alert(email: str, alerts: List[Dict[str, Any]]) -> None:
    """
    Send alert email via Resend API directly.
    Never raises — logs warning on failure.
    """
    resend_key = os.getenv("RESEND_API_KEY", "")
    if not resend_key or not email:
        logger.warning("sentinel: skipping alert email — RESEND_API_KEY or alert_email not set")
        return

    lines = ["Infrastructure usage alert from NAMA OS Sentinel:\n"]
    for a in alerts:
        lines.append(f"  • {a['service'].upper()} / {a['metric']}: {a['value']}% (threshold: {a['threshold']}%)")
    body = "\n".join(lines)

    try:
        from_email = os.getenv("RESEND_FROM_EMAIL", "NAMA OS <onboarding@getnama.app>")
        httpx.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {resend_key}", "Content-Type": "application/json"},
            json={
                "from": from_email,
                "to": [email],
                "subject": f"[NAMA Sentinel] {len(alerts)} usage threshold alert(s) triggered",
                "text": body,
            },
            timeout=HTTPX_TIMEOUT,
        )
    except Exception as exc:
        logger.warning("sentinel: failed to send alert email: %s", exc)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_tenant(tenant_id: int, db: Session) -> Tenant:
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant


def _get_settings(tenant: Tenant) -> dict:
    return tenant.settings or {}


def _save_settings(tenant: Tenant, settings: dict, db: Session) -> None:
    from sqlalchemy import text
    db.execute(
        text("UPDATE tenants SET settings = :s WHERE id = :id"),
        {"s": __import__("json").dumps(settings), "id": tenant.id},
    )
    db.commit()
    db.refresh(tenant)


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/config")
def get_sentinel_config(
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
):
    """Return the current sentinel threshold/notification config."""
    tenant = _get_tenant(tenant_id, db)
    settings = _get_settings(tenant)
    config = settings.get("sentinel_config", {})
    # Return api_keys with values masked (show whether key is set, not the value)
    raw_keys = settings.get("sentinel_api_keys", {})
    masked_keys = {k: ("***" if v else "") for k, v in raw_keys.items()}
    return {
        "config": config or SentinelConfig().model_dump(),
        "api_keys_configured": masked_keys,
    }


@router.post("/config")
def save_sentinel_config(
    body: SentinelConfigSaveRequest,
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
):
    """Save threshold config and optionally update API keys."""
    tenant = _get_tenant(tenant_id, db)
    settings = dict(_get_settings(tenant))

    settings["sentinel_config"] = body.config.model_dump()

    if body.api_keys is not None:
        existing_keys = settings.get("sentinel_api_keys", {})
        incoming = body.api_keys.model_dump()
        # Only overwrite fields that are non-empty (preserve existing values if blank)
        for k, v in incoming.items():
            if v:
                existing_keys[k] = v
        settings["sentinel_api_keys"] = existing_keys

    _save_settings(tenant, settings, db)
    return {"saved": True}


@router.get("/check")
def check_sentinel(
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
):
    """
    Manually trigger a usage check across all enabled services.
    Appends triggered alerts to sentinel_alerts history and sends email if needed.
    """
    tenant = _get_tenant(tenant_id, db)
    settings = dict(_get_settings(tenant))

    raw_config = settings.get("sentinel_config", {})
    config = SentinelConfig(**raw_config) if raw_config else SentinelConfig()
    keys_raw = settings.get("sentinel_api_keys", {})
    keys = SentinelApiKeys(**{k: keys_raw.get(k, "") for k in SentinelApiKeys.model_fields})

    now_iso = datetime.now(timezone.utc).isoformat()
    snapshot: Dict[str, Any] = {"checked_at": now_iso, "services": {}}
    triggered_alerts: List[Dict[str, Any]] = []

    # ── Vercel ────────────────────────────────────────────────────────────────
    if config.vercel.enabled:
        vercel = _fetch_vercel_usage(keys.vercel_api_token, keys.vercel_team_id)
        snapshot["services"]["vercel"] = vercel
        for metric_key, pct_key in [("bandwidth", "pct_bandwidth"), ("compute", "pct_compute")]:
            pct = vercel.get(pct_key)
            if pct is not None and pct >= config.alert_pct:
                triggered_alerts.append({
                    "ts": now_iso,
                    "service": "vercel",
                    "metric": metric_key,
                    "value": pct,
                    "threshold": config.alert_pct,
                    "level": "alert",
                })
            elif pct is not None and pct >= config.warn_pct:
                triggered_alerts.append({
                    "ts": now_iso,
                    "service": "vercel",
                    "metric": metric_key,
                    "value": pct,
                    "threshold": config.warn_pct,
                    "level": "warn",
                })

    # ── Railway ───────────────────────────────────────────────────────────────
    if config.railway.enabled:
        railway = _fetch_railway_usage(keys.railway_api_token)
        snapshot["services"]["railway"] = railway
        pct = railway.get("pct_cost")
        if pct is not None and pct >= config.alert_pct:
            triggered_alerts.append({
                "ts": now_iso,
                "service": "railway",
                "metric": "cost",
                "value": pct,
                "threshold": config.alert_pct,
                "level": "alert",
            })
        elif pct is not None and pct >= config.warn_pct:
            triggered_alerts.append({
                "ts": now_iso,
                "service": "railway",
                "metric": "cost",
                "value": pct,
                "threshold": config.warn_pct,
                "level": "warn",
            })

    # ── Neon ──────────────────────────────────────────────────────────────────
    if config.neon.enabled:
        neon = _fetch_neon_usage(keys.neon_api_key, keys.neon_project_id)
        snapshot["services"]["neon"] = neon
        for metric_key, pct_key in [("storage", "pct_storage"), ("compute", "pct_compute")]:
            pct = neon.get(pct_key)
            if pct is not None and pct >= config.alert_pct:
                triggered_alerts.append({
                    "ts": now_iso,
                    "service": "neon",
                    "metric": metric_key,
                    "value": pct,
                    "threshold": config.alert_pct,
                    "level": "alert",
                })
            elif pct is not None and pct >= config.warn_pct:
                triggered_alerts.append({
                    "ts": now_iso,
                    "service": "neon",
                    "metric": metric_key,
                    "value": pct,
                    "threshold": config.warn_pct,
                    "level": "warn",
                })

    snapshot["alerts_triggered"] = len(triggered_alerts)

    # ── Persist alert history ─────────────────────────────────────────────────
    if triggered_alerts:
        history: List[dict] = settings.get("sentinel_alerts", [])
        history = triggered_alerts + history           # prepend newest
        settings["sentinel_alerts"] = history[:MAX_ALERT_HISTORY]  # FIFO cap
        _save_settings(tenant, settings, db)

        # Send email notification (best-effort)
        if config.alert_email:
            _send_sentinel_alert(config.alert_email, triggered_alerts)

    return snapshot


@router.get("/history")
def get_sentinel_history(
    limit: int = 10,
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
):
    """Return the last N alerts from alert history."""
    tenant = _get_tenant(tenant_id, db)
    settings = _get_settings(tenant)
    history = settings.get("sentinel_alerts", [])
    return {
        "alerts": history[:min(limit, MAX_ALERT_HISTORY)],
        "total": len(history),
    }
