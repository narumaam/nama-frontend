"""Fire-and-forget webhook dispatcher."""
import hashlib
import hmac
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict

logger = logging.getLogger(__name__)

SUPPORTED_EVENTS = [
    "lead.created", "lead.status_changed", "lead.assigned",
    "booking.created", "booking.confirmed", "booking.cancelled",
    "quotation.sent", "quotation.accepted",
]


def dispatch_webhook_sync(tenant_id: int, event: str, payload: Dict[str, Any], db) -> None:
    """
    Synchronous fire-and-forget webhook dispatcher.
    Finds active endpoints for tenant+event and POSTs payload.
    Never raises — all errors are caught and logged.
    """
    try:
        import httpx
        from app.models.webhooks import WebhookEndpoint

        endpoints = db.query(WebhookEndpoint).filter(
            WebhookEndpoint.tenant_id == tenant_id,
            WebhookEndpoint.is_active == True,
        ).all()

        active = [e for e in endpoints if event in (e.events or [])]
        if not active:
            return

        body = json.dumps({
            "event": event,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": payload,
        }, default=str)

        for endpoint in active:
            try:
                signature = hmac.new(
                    endpoint.secret.encode(),
                    body.encode(),
                    hashlib.sha256,
                ).hexdigest()
                resp = httpx.post(
                    endpoint.url,
                    content=body,
                    headers={
                        "Content-Type": "application/json",
                        "X-NAMA-Signature": f"sha256={signature}",
                        "X-NAMA-Event": event,
                    },
                    timeout=5.0,
                )
                endpoint.delivery_count = (endpoint.delivery_count or 0) + 1
                endpoint.last_triggered_at = datetime.now(timezone.utc)
                if resp.status_code >= 400:
                    endpoint.failure_count = (endpoint.failure_count or 0) + 1
                db.add(endpoint)
            except Exception as ex:
                endpoint.failure_count = (endpoint.failure_count or 0) + 1
                db.add(endpoint)
                logger.warning("webhook dispatch failed for %s: %s", endpoint.url, ex)
        db.commit()
    except Exception as e:
        logger.error("webhook_dispatcher error: %s", e)
