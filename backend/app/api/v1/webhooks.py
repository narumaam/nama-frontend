"""
M19 — Webhook Handler
-----------------------
Handles inbound webhooks from:
  - WhatsApp Business API (Meta Cloud API)
  - Razorpay payment events
  - Custom / generic sources

Security:
  - WhatsApp: hub.verify_token challenge (GET) + X-Hub-Signature-256 HMAC (POST)
  - Razorpay: X-Razorpay-Signature HMAC-SHA256 with webhook_secret
  - All payloads persisted BEFORE processing (at-least-once delivery)
  - All POST handlers use BackgroundTasks → return 200 in < 1s

WhatsApp → M1 triage flow:
  inbound message → HMAC verify → persist InboundWebhookEvent →
  background: extract text + sender → QueryTriageAgent → Lead created
"""

import hashlib
import hmac
import json
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Header, Query, Request, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.webhooks import InboundWebhookEvent, WebhookSource

logger = logging.getLogger(__name__)
router = APIRouter()


# ── HMAC helpers ───────────────────────────────────────────────────────────────

def _verify_whatsapp_signature(body: bytes, sig_header: str, secret: str) -> bool:
    """Verify Meta X-Hub-Signature-256: sha256=<hex>"""
    if not sig_header or not sig_header.startswith("sha256="):
        return False
    expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, sig_header[7:])


def _verify_razorpay_signature(body: bytes, sig_header: str, secret: str) -> bool:
    """Verify Razorpay X-Razorpay-Signature HMAC-SHA256"""
    if not sig_header:
        return False
    expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, sig_header)


# ── Background processing ──────────────────────────────────────────────────────

async def _process_whatsapp_event(payload: dict, db: Session) -> None:
    """Extract messages from WhatsApp Cloud API payload → M1 QueryTriageAgent."""
    try:
        entry   = payload.get("entry", [{}])[0]
        changes = entry.get("changes", [{}])[0]
        value   = changes.get("value", {})
        messages = value.get("messages", [])
        contacts = value.get("contacts", [])

        for msg in messages:
            if msg.get("type") != "text":
                continue

            raw_text    = msg.get("text", {}).get("body", "")
            sender_id   = msg.get("from", "unknown")

            if not raw_text:
                continue

            logger.info(f"WhatsApp from {sender_id}: {raw_text[:80]}")

            # Map phone_number_id → tenant (simplified: tenant_id=1 for MVP)
            # Production: query integration_configs table by phone_number_id
            tenant_id = 1

            try:
                from app.agents.triage import QueryTriageAgent
                from app.schemas.queries import RawQuery

                triage_agent = QueryTriageAgent()
                query = RawQuery(
                    raw_message=raw_text,
                    source="WHATSAPP",
                    sender_id=sender_id,
                )
                result = await triage_agent.triage(query, db=db, tenant_id=tenant_id)
                logger.info(f"Triaged WhatsApp msg → lead_id={result.lead_id} confidence={result.triage_confidence}")
            except Exception as exc:
                logger.warning(f"Triage failed for WhatsApp msg from {sender_id}: {exc}")

    except Exception as exc:
        logger.error(f"WhatsApp event processing error: {exc}", exc_info=True)


async def _process_razorpay_event(payload: dict, db: Session) -> None:
    """
    Handle Razorpay payment.captured → mark booking as PAID.
    notes.booking_id must be set when creating the Razorpay order.
    """
    try:
        event_type = payload.get("event", "")
        entity     = payload.get("payload", {}).get("payment", {}).get("entity", {})

        if event_type == "payment.captured":
            amount_inr = entity.get("amount", 0) / 100
            booking_id = entity.get("notes", {}).get("booking_id")

            logger.info(f"Razorpay payment.captured ₹{amount_inr} booking_id={booking_id}")

            if booking_id:
                from app.models.bookings import Booking
                booking = db.query(Booking).filter(Booking.id == int(booking_id)).first()
                if booking:
                    booking.payment_status = "PAID"
                    booking.payment_id = entity.get("id")
                    db.commit()
                    logger.info(f"Booking #{booking_id} marked PAID")

    except Exception as exc:
        logger.error(f"Razorpay event processing error: {exc}", exc_info=True)


# ── WhatsApp verification GET ──────────────────────────────────────────────────

@router.get("/whatsapp", summary="WhatsApp webhook verification challenge")
async def whatsapp_verify(
    hub_mode:         Optional[str] = Query(None, alias="hub.mode"),
    hub_challenge:    Optional[str] = Query(None, alias="hub.challenge"),
    hub_verify_token: Optional[str] = Query(None, alias="hub.verify_token"),
):
    """
    Meta sends a GET with hub.verify_token during webhook setup.
    Echo back hub.challenge if the token matches.
    """
    import os
    expected = os.getenv("WHATSAPP_VERIFY_TOKEN", "nama_whatsapp_verify_2024")

    if hub_mode == "subscribe" and hub_verify_token == expected:
        logger.info("WhatsApp webhook verified")
        return int(hub_challenge) if hub_challenge and hub_challenge.isdigit() else hub_challenge

    logger.warning(f"WhatsApp verify failed: mode={hub_mode}, token={hub_verify_token!r}")
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Verification token mismatch")


# ── WhatsApp inbound POST ──────────────────────────────────────────────────────

@router.post("/whatsapp", status_code=status.HTTP_200_OK, summary="Receive WhatsApp messages")
async def whatsapp_inbound(
    request:              Request,
    background_tasks:     BackgroundTasks,
    x_hub_signature_256:  Optional[str] = Header(None, alias="X-Hub-Signature-256"),
    db: Session = Depends(get_db),
):
    """
    Receive inbound WhatsApp messages. Must return 200 < 20s or Meta retries.
    HMAC verification optional in dev (set WHATSAPP_APP_SECRET to enable).
    """
    import os
    body = await request.body()

    wa_secret = os.getenv("WHATSAPP_APP_SECRET", "")
    if wa_secret and not _verify_whatsapp_signature(body, x_hub_signature_256 or "", wa_secret):
        logger.warning("WhatsApp HMAC verification failed")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid signature")

    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON body")

    # Persist before processing (at-least-once delivery guarantee)
    event = InboundWebhookEvent(
        source=WebhookSource.WHATSAPP,
        event_type="messages",
        payload_json=json.dumps(payload),
    )
    try:
        db.add(event)
        db.commit()
        db.refresh(event)
    except Exception:
        db.rollback()

    background_tasks.add_task(_process_whatsapp_event, payload, db)
    return {"status": "ok"}


# ── Razorpay POST ──────────────────────────────────────────────────────────────

@router.post("/razorpay", status_code=status.HTTP_200_OK, summary="Receive Razorpay events")
async def razorpay_inbound(
    request:              Request,
    background_tasks:     BackgroundTasks,
    x_razorpay_signature: Optional[str] = Header(None, alias="X-Razorpay-Signature"),
    db: Session = Depends(get_db),
):
    """
    Receive Razorpay webhook events (payment.captured, payment.failed, etc.)
    HMAC verification optional in dev (set RAZORPAY_WEBHOOK_SECRET to enable).
    """
    import os
    body = await request.body()

    rz_secret = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")
    if rz_secret and not _verify_razorpay_signature(body, x_razorpay_signature or "", rz_secret):
        logger.warning("Razorpay HMAC verification failed")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid signature")

    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON body")

    event = InboundWebhookEvent(
        source=WebhookSource.RAZORPAY,
        event_type=payload.get("event", "unknown"),
        payload_json=json.dumps(payload),
    )
    try:
        db.add(event)
        db.commit()
    except Exception:
        db.rollback()

    background_tasks.add_task(_process_razorpay_event, payload, db)
    return {"status": "ok"}


# ── Generic inbound POST ───────────────────────────────────────────────────────

@router.post("/inbound", status_code=status.HTTP_200_OK, summary="Generic inbound webhook")
async def generic_inbound(
    request: Request,
    source:  str = Query("custom"),
    db: Session = Depends(get_db),
):
    """
    Generic catch-all for custom integrations (Telegram, HubSpot, etc.)
    Persists the raw payload for manual or automated processing.
    """
    body = await request.body()
    try:
        payload = json.loads(body) if body else {}
    except json.JSONDecodeError:
        payload = {"raw": body.decode("utf-8", errors="replace")}

    event = InboundWebhookEvent(
        source=WebhookSource.GENERIC,
        event_type=payload.get("event") or payload.get("type", "unknown"),
        payload_json=json.dumps(payload),
    )
    try:
        db.add(event)
        db.commit()
        db.refresh(event)
    except Exception:
        db.rollback()

    return {"status": "ok", "event_id": event.id}


# ── Outbound Webhook Endpoint CRUD ─────────────────────────────────────────────

import secrets as _secrets
from typing import List, Optional
from pydantic import BaseModel
from app.api.v1.deps import require_tenant
from app.models.webhooks import WebhookEndpoint

OUTBOUND_SUPPORTED_EVENTS = [
    "lead.created", "lead.status_changed", "lead.assigned",
    "booking.created", "booking.confirmed", "booking.cancelled",
    "quotation.sent", "quotation.accepted",
]


class WebhookCreate(BaseModel):
    url: str
    events: List[str]
    description: Optional[str] = None


class WebhookUpdate(BaseModel):
    url: Optional[str] = None
    events: Optional[List[str]] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class WebhookOut(BaseModel):
    id: int
    url: str
    events: List[str]
    description: Optional[str]
    is_active: bool
    secret: str
    delivery_count: int
    failure_count: int
    last_triggered_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/outbound", response_model=List[WebhookOut], summary="List outbound webhook endpoints")
def list_outbound_webhooks(
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
):
    return db.query(WebhookEndpoint).filter(WebhookEndpoint.tenant_id == tenant_id).all()


@router.post("/outbound", response_model=WebhookOut, status_code=201, summary="Create outbound webhook endpoint")
def create_outbound_webhook(
    body: WebhookCreate,
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
):
    invalid = [e for e in body.events if e not in OUTBOUND_SUPPORTED_EVENTS]
    if invalid:
        raise HTTPException(400, f"Unknown events: {invalid}. Supported: {OUTBOUND_SUPPORTED_EVENTS}")
    wh = WebhookEndpoint(
        tenant_id=tenant_id,
        url=body.url,
        events=body.events,
        description=body.description,
        secret=_secrets.token_hex(32),
    )
    db.add(wh)
    db.commit()
    db.refresh(wh)
    return wh


@router.put("/outbound/{webhook_id}", response_model=WebhookOut, summary="Update outbound webhook endpoint")
def update_outbound_webhook(
    webhook_id: int,
    body: WebhookUpdate,
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
):
    wh = db.query(WebhookEndpoint).filter(
        WebhookEndpoint.id == webhook_id,
        WebhookEndpoint.tenant_id == tenant_id,
    ).first()
    if not wh:
        raise HTTPException(404, "Webhook not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(wh, k, v)
    db.commit()
    db.refresh(wh)
    return wh


@router.delete("/outbound/{webhook_id}", summary="Delete outbound webhook endpoint")
def delete_outbound_webhook(
    webhook_id: int,
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
):
    wh = db.query(WebhookEndpoint).filter(
        WebhookEndpoint.id == webhook_id,
        WebhookEndpoint.tenant_id == tenant_id,
    ).first()
    if not wh:
        raise HTTPException(404, "Webhook not found")
    db.delete(wh)
    db.commit()
    return {"deleted": True}


@router.post("/outbound/{webhook_id}/test", summary="Send test event to outbound webhook")
def test_outbound_webhook(
    webhook_id: int,
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
):
    wh = db.query(WebhookEndpoint).filter(
        WebhookEndpoint.id == webhook_id,
        WebhookEndpoint.tenant_id == tenant_id,
    ).first()
    if not wh:
        raise HTTPException(404, "Webhook not found")
    from app.core.webhook_dispatcher import dispatch_webhook_sync
    dispatch_webhook_sync(
        tenant_id,
        "lead.created",
        {"test": True, "message": "NAMA OS test event", "webhook_id": webhook_id},
        db,
    )
    return {"sent": True}
