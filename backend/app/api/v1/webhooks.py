"""
M19 — Webhook Handler
-----------------------
Handles inbound webhooks from:
  - WhatsApp Business API (Meta Cloud API)
  - Razorpay payment events
  - Custom outbound webhook test/verify

Security:
  - WhatsApp uses a hub.verify_token challenge (GET) + X-Hub-Signature-256 HMAC (POST)
  - Razorpay uses X-Razorpay-Signature HMAC-SHA256 with webhook_secret
  - All payloads processed asynchronously (BackgroundTasks) to return 200 quickly

WhatsApp → M1 flow:
  inbound message → extract raw_message + sender_id → call QueryTriageAgent
  → persist Lead → (future) send WhatsApp reply via Cloud API
"""

import hashlib
import hmac
import json
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, Header, Query, Request, status
from sqlalchemy.orm import Session

from app.db.session import get_db, Base
from fastapi import Depends
import sqlalchemy as sa

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Models ─────────────────────────────────────────────────────────────────────
class WebhookEvent(Base):
    __tablename__ = "webhook_events"

    id            = sa.Column(sa.Integer, primary_key=True)
    source        = sa.Column(sa.String(50), nullable=False)   # "whatsapp" | "razorpay" | "custom"
    event_type    = sa.Column(sa.String(100), nullable=True)
    payload_json  = sa.Column(sa.Text, nullable=False, default="{}")
    processed     = sa.Column(sa.Boolean, default=False)
    error_message = sa.Column(sa.Text, nullable=True)
    created_at    = sa.Column(sa.DateTime, default=lambda: datetime.now(timezone.utc))


# ── HMAC Verification Helpers ──────────────────────────────────────────────────
def _verify_whatsapp_signature(body: bytes, signature_header: str, secret: str) -> bool:
    """Verify X-Hub-Signature-256: sha256=<hex> header from Meta."""
    if not signature_header or not signature_header.startswith("sha256="):
        return False
    expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    received = signature_header[7:]
    return hmac.compare_digest(expected, received)


def _verify_razorpay_signature(body: bytes, signature_header: str, secret: str) -> bool:
    """Verify X-Razorpay-Signature header."""
    if not signature_header:
        return False
    expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature_header)


# ── Background Processing ──────────────────────────────────────────────────────
async def _process_whatsapp_event(payload: dict, db: Session) -> None:
    """
    Process a WhatsApp Cloud API webhook payload.
    Extracts messages and routes to M1 query triage.
    """
    try:
        entry = payload.get("entry", [{}])[0]
        changes = entry.get("changes", [{}])[0]
        value = changes.get("value", {})
        messages = value.get("messages", [])
        contacts = value.get("contacts", [])

        for msg in messages:
            if msg.get("type") != "text":
                continue

            raw_text  = msg.get("text", {}).get("body", "")
            sender_id = msg.get("from", "unknown")
            sender_name = contacts[0].get("profile", {}).get("name", "") if contacts else ""

            if not raw_text:
                continue

            logger.info(f"WhatsApp message from {sender_id}: {raw_text[:80]}")

            # Try to find a tenant via phone number mapping (simplified: use tenant_id=1 for now)
            # In production, map phone_number_id → tenant via integration config table
            tenant_id = 1

            try:
                from app.agents.triage import QueryTriageAgent
                from app.core.leads import create_lead_from_triage
                from app.schemas.queries import RawQuery

                triage_agent = QueryTriageAgent()
                query = RawQuery(
                    raw_message=raw_text,
                    source="WHATSAPP",
                    sender_id=sender_id,
                )
                result = await triage_agent.triage(query, db=db, tenant_id=tenant_id)
                logger.info(f"WhatsApp message triaged → lead_id={result.lead_id} confidence={result.triage_confidence}")
            except Exception as e:
                logger.warning(f"Triage failed for WhatsApp message from {sender_id}: {e}")

    except Exception as e:
        logger.error(f"Error processing WhatsApp event: {e}", exc_info=True)


async def _process_razorpay_event(payload: dict, db: Session) -> None:
    """
    Process Razorpay webhook: payment.captured → update booking payment status.
    """
    try:
        event_type = payload.get("event")
        entity     = payload.get("payload", {}).get("payment", {}).get("entity", {})

        if event_type == "payment.captured":
            amount_paise = entity.get("amount", 0)
            amount_inr   = amount_paise / 100
            notes        = entity.get("notes", {})
            booking_id   = notes.get("booking_id")

            logger.info(f"Razorpay payment.captured: amount=₹{amount_inr} booking_id={booking_id}")

            if booking_id:
                from app.models.bookings import Booking
                booking = db.query(Booking).filter(Booking.id == int(booking_id)).first()
                if booking:
                    booking.payment_status = "PAID"
                    booking.payment_id = entity.get("id")
                    db.commit()
                    logger.info(f"Booking #{booking_id} marked as PAID")

    except Exception as e:
        logger.error(f"Error processing Razorpay event: {e}", exc_info=True)


# ── WhatsApp Verification (GET) ────────────────────────────────────────────────
@router.get(
    "/whatsapp",
    summary="WhatsApp webhook verification challenge",
)
async def whatsapp_verify(
    hub_mode:        Optional[str] = Query(None, alias="hub.mode"),
    hub_challenge:   Optional[str] = Query(None, alias="hub.challenge"),
    hub_verify_token: Optional[str] = Query(None, alias="hub.verify_token"),
):
    """
    Meta sends a GET with hub.verify_token during webhook setup.
    We must echo back hub.challenge if the token matches.
    """
    import os
    expected_token = os.getenv("WHATSAPP_VERIFY_TOKEN", "nama_whatsapp_verify_2024")

    if hub_mode == "subscribe" and hub_verify_token == expected_token:
        logger.info("WhatsApp webhook verified successfully")
        return int(hub_challenge) if hub_challenge and hub_challenge.isdigit() else hub_challenge

    logger.warning(f"WhatsApp verification failed: mode={hub_mode}, token={hub_verify_token!r}")
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Verification token mismatch")


# ── WhatsApp Inbound Messages (POST) ──────────────────────────────────────────
@router.post(
    "/whatsapp",
    status_code=status.HTTP_200_OK,
    summary="Receive WhatsApp Business API messages",
)
async def whatsapp_inbound(
    request:          Request,
    background_tasks: BackgroundTasks,
    x_hub_signature_256: Optional[str] = Header(None, alias="X-Hub-Signature-256"),
    db: Session = Depends(get_db),
):
    """
    Receives inbound WhatsApp messages from Meta Cloud API.
    Verifies HMAC signature, then processes asynchronously.
    Must return 200 within 20s or Meta will retry.
    """
    import os
    body = await request.body()

    # Signature verification (skip in dev if secret not set)
    wa_secret = os.getenv("WHATSAPP_APP_SECRET", "")
    if wa_secret and not _verify_whatsapp_signature(body, x_hub_signature_256 or "", wa_secret):
        logger.warning("WhatsApp signature verification failed")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid signature")

    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON")

    # Persist the event
    event = WebhookEvent(
        source="whatsapp",
        event_type="messages",
        payload_json=json.dumps(payload),
    )
    try:
        db.add(event)
        db.commit()
    except Exception:
        db.rollback()

    # Process asynchronously — always return 200 first
    background_tasks.add_task(_process_whatsapp_event, payload, db)

    return {"status": "ok"}


# ── Razorpay Payments (POST) ───────────────────────────────────────────────────
@router.post(
    "/razorpay",
    status_code=status.HTTP_200_OK,
    summary="Receive Razorpay payment events",
)
async def razorpay_inbound(
    request:   Request,
    background_tasks: BackgroundTasks,
    x_razorpay_signature: Optional[str] = Header(None, alias="X-Razorpay-Signature"),
    db: Session = Depends(get_db),
):
    """
    Receives Razorpay webhook events (payment.captured, payment.failed, etc.)
    Verifies HMAC-SHA256 signature, then processes asynchronously.
    """
    import os
    body = await request.body()

    rz_secret = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")
    if rz_secret and not _verify_razorpay_signature(body, x_razorpay_signature or "", rz_secret):
        logger.warning("Razorpay signature verification failed")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid signature")

    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON")

    event = WebhookEvent(
        source="razorpay",
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


# ── Generic Inbound Webhook ────────────────────────────────────────────────────
@router.post(
    "/inbound",
    status_code=status.HTTP_200_OK,
    summary="Generic NAMA inbound webhook receiver",
)
async def generic_inbound(
    request:   Request,
    source:    str = Query("custom"),
    db: Session = Depends(get_db),
):
    """
    Generic endpoint for custom integrations.
    Persists the event payload for processing.
    """
    body = await request.body()
    try:
        payload = json.loads(body) if body else {}
    except json.JSONDecodeError:
        payload = {"raw": body.decode("utf-8", errors="replace")}

    event = WebhookEvent(
        source=source,
        event_type=payload.get("event") or payload.get("type", "unknown"),
        payload_json=json.dumps(payload),
    )
    try:
        db.add(event)
        db.commit()
    except Exception:
        db.rollback()

    return {"status": "ok", "event_id": event.id}
