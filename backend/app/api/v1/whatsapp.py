"""
WhatsApp Business Cloud API — NAMA OS
GET  /api/v1/whatsapp/webhook  — Meta webhook verification (GET with hub.challenge)
POST /api/v1/whatsapp/webhook  — Inbound message handler (creates Lead automatically)
POST /api/v1/whatsapp/send     — Send template or text message to a number
GET  /api/v1/whatsapp/templates — List approved message templates
GET  /api/v1/whatsapp/status   — Check connection status

Registration: add to backend/app/main.py:
    from app.api.v1 import whatsapp as whatsapp_router
    app.include_router(whatsapp_router.router, prefix="/api/v1/whatsapp", tags=["whatsapp"])
"""
import os
import hashlib
import hmac
import logging
import httpx
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Request, Query, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.v1.deps import require_tenant, get_token_claims

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Config ─────────────────────────────────────────────────────────────────────
WA_TOKEN        = lambda: os.getenv("WHATSAPP_TOKEN", "")
WA_PHONE_ID     = lambda: os.getenv("WHATSAPP_PHONE_ID", "")
WA_VERIFY_TOKEN = lambda: os.getenv("WHATSAPP_VERIFY_TOKEN", "nama_webhook_verify")
WA_APP_SECRET   = lambda: os.getenv("WHATSAPP_APP_SECRET", "")
WA_API_BASE     = "https://graph.facebook.com/v19.0"


# ── Webhook verification (GET) ─────────────────────────────────────────────────

@router.get("/webhook")
def verify_webhook(
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_challenge: str = Query(None, alias="hub.challenge"),
    hub_verify_token: str = Query(None, alias="hub.verify_token"),
):
    """Meta webhook subscription verification — returns hub.challenge as plain int."""
    if hub_mode == "subscribe" and hub_verify_token == WA_VERIFY_TOKEN():
        return int(hub_challenge)
    raise HTTPException(403, "Verification failed")


# ── Inbound message handler (POST) ────────────────────────────────────────────

@router.post("/webhook")
async def receive_message(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Receives WhatsApp messages from Meta. Creates Lead records automatically.
    Always returns HTTP 200 — Meta will retry on non-200 responses.
    """
    try:
        body_bytes = await request.body()
        payload = await request.json()

        # Validate X-Hub-Signature-256 if WHATSAPP_APP_SECRET is set
        app_secret = WA_APP_SECRET()
        if app_secret:
            sig_header = request.headers.get("X-Hub-Signature-256", "")
            expected = "sha256=" + hmac.new(
                app_secret.encode(), body_bytes, hashlib.sha256
            ).hexdigest()
            if not hmac.compare_digest(sig_header, expected):
                raise HTTPException(401, "Invalid signature")

        # Process each message entry
        for entry in payload.get("entry", []):
            for change in entry.get("changes", []):
                value = change.get("value", {})
                for msg in value.get("messages", []):
                    background_tasks.add_task(_process_inbound, msg, value, db)

        return {"status": "ok"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error("WhatsApp webhook error: %s", e)
        return {"status": "ok"}  # Always return 200 to Meta


async def _process_inbound(msg: dict, value: dict, db: Session):
    """
    Creates or updates a Lead from an inbound WhatsApp message.
    Runs in background so webhook endpoint can respond < 1s.
    """
    try:
        from app.models.leads import Lead, LeadSource, LeadStatus

        wa_from  = msg.get("from", "")   # e.g. "919876543210"
        msg_type = msg.get("type", "text")

        text = ""
        if msg_type == "text":
            text = msg.get("text", {}).get("body", "")
        elif msg_type == "button":
            text = msg.get("button", {}).get("text", "")
        elif msg_type == "interactive":
            # Handle button replies and list replies
            interactive = msg.get("interactive", {})
            if interactive.get("type") == "button_reply":
                text = interactive.get("button_reply", {}).get("title", "")
            elif interactive.get("type") == "list_reply":
                text = interactive.get("list_reply", {}).get("title", "")

        # Extract contact name from contacts array if available
        contacts      = value.get("contacts", [])
        contact_name  = (
            contacts[0].get("profile", {}).get("name", "")
            if contacts else ""
        )

        if not wa_from:
            return

        phone_display = f"+{wa_from}"
        timestamp_str = datetime.now(timezone.utc).strftime("%d/%m %H:%M")

        # Check if an open lead already exists for this sender
        existing = (
            db.query(Lead)
            .filter(
                Lead.sender_id == wa_from,
                Lead.status.notin_(["WON", "LOST"]),
            )
            .first()
        )

        if existing:
            # Append the new message to notes
            existing.notes = (
                (existing.notes or "") +
                f"\n[WA {timestamp_str}] {text}"
            )
            db.commit()
            logger.info("_process_inbound: appended to existing lead %s", existing.id)
        else:
            # Create a new Lead — default to tenant 1 (real impl: map phone_id → tenant)
            new_lead = Lead(
                tenant_id       = 1,
                sender_id       = wa_from,
                source          = LeadSource.WHATSAPP,
                full_name       = contact_name or phone_display,
                phone           = phone_display,
                status          = LeadStatus.NEW,
                notes           = f"[WA {timestamp_str}] {text}",
                raw_message     = text,
                triage_confidence = 0.5,
            )
            db.add(new_lead)
            db.commit()
            logger.info("_process_inbound: created new lead from %s", wa_from)

    except Exception as e:
        logger.error("_process_inbound error: %s", e)


# ── Send message ───────────────────────────────────────────────────────────────

class SendMessageRequest(BaseModel):
    to: str                             # Phone with country code, e.g. "919876543210"
    message_type: str = "text"          # "text" | "template"
    text: Optional[str] = None
    template_name: Optional[str] = None
    template_language: str = "en"
    template_params: List[str] = []


class SendMessageResponse(BaseModel):
    success: bool
    message_id: Optional[str] = None
    demo: bool = False
    error: Optional[str] = None


@router.post("/send", response_model=SendMessageResponse)
async def send_message(
    body: SendMessageRequest,
    _claims: dict = Depends(get_token_claims),
):
    """
    Send a WhatsApp message (text or approved template).
    Returns demo mode response when WHATSAPP_TOKEN / WHATSAPP_PHONE_ID are absent.
    """
    token    = WA_TOKEN()
    phone_id = WA_PHONE_ID()

    if not token or not phone_id:
        logger.info("WhatsApp: demo mode — WHATSAPP_TOKEN/PHONE_ID not set")
        return SendMessageResponse(
            success=True,
            message_id="demo_msg_001",
            demo=True,
        )

    # Normalise phone number: strip +, spaces, dashes
    to = body.to.replace("+", "").replace(" ", "").replace("-", "")

    if body.message_type == "template" and body.template_name:
        payload = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "template",
            "template": {
                "name": body.template_name,
                "language": {"code": body.template_language},
                "components": (
                    [
                        {
                            "type": "body",
                            "parameters": [
                                {"type": "text", "text": p}
                                for p in body.template_params
                            ],
                        }
                    ]
                    if body.template_params
                    else []
                ),
            },
        }
    else:
        payload = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "text",
            "text": {"body": body.text or "Hello from NAMA OS"},
        }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{WA_API_BASE}/{phone_id}/messages",
                json=payload,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
                timeout=10.0,
            )
            data = resp.json()
            if resp.status_code == 200:
                msg_id = data.get("messages", [{}])[0].get("id", "")
                return SendMessageResponse(success=True, message_id=msg_id)
            else:
                error_msg = (
                    data.get("error", {}).get("message", "Send failed")
                    if isinstance(data.get("error"), dict)
                    else str(data.get("error", "Send failed"))
                )
                return SendMessageResponse(success=False, error=error_msg)
    except Exception as e:
        logger.error("WhatsApp send error: %s", e)
        return SendMessageResponse(success=False, error=str(e))


# ── Templates list ─────────────────────────────────────────────────────────────

@router.get("/templates")
def list_templates(_claims: dict = Depends(get_token_claims)):
    """Returns NAMA's pre-approved WhatsApp message templates (static catalogue)."""
    return {
        "templates": [
            {
                "name":     "lead_acknowledgement",
                "language": "en",
                "category": "UTILITY",
                "body":     "Hi {{1}}, thanks for reaching out to {{2}}! We've received your enquiry about {{3}} and will get back to you shortly. — {{4}}",
                "params":   ["client_name", "agency_name", "destination", "agent_name"],
            },
            {
                "name":     "quote_ready",
                "language": "en",
                "category": "UTILITY",
                "body":     "Hi {{1}}, your personalised travel quote for {{2}} is ready! Total: {{3}}. View it here: {{4}}",
                "params":   ["client_name", "destination", "amount", "quote_link"],
            },
            {
                "name":     "booking_confirmed",
                "language": "en",
                "category": "UTILITY",
                "body":     "✅ Booking confirmed! Hi {{1}}, your trip to {{2}} on {{3}} is confirmed. Booking ref: {{4}}. Have a great trip!",
                "params":   ["client_name", "destination", "travel_date", "booking_ref"],
            },
            {
                "name":     "follow_up",
                "language": "en",
                "category": "MARKETING",
                "body":     "Hi {{1}}, just checking in on your {{2}} enquiry. Any questions? We're here to help!",
                "params":   ["client_name", "destination"],
            },
            {
                "name":     "payment_reminder",
                "language": "en",
                "category": "UTILITY",
                "body":     "Hi {{1}}, a friendly reminder that ₹{{2}} is due for your {{3}} booking. Pay here: {{4}}",
                "params":   ["client_name", "amount", "destination", "payment_link"],
            },
        ]
    }


# ── Connection status ──────────────────────────────────────────────────────────

@router.get("/status")
def whatsapp_status(_claims: dict = Depends(get_token_claims)):
    """Returns connection status — live if both env vars are set, demo otherwise."""
    token    = WA_TOKEN()
    phone_id = WA_PHONE_ID()
    if token and phone_id:
        return {
            "connected": True,
            "phone_id":  phone_id,
            "mode":      "live",
        }
    return {
        "connected": False,
        "mode":      "demo",
        "message":   "Add WHATSAPP_TOKEN and WHATSAPP_PHONE_ID in Railway to activate",
    }
