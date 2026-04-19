"""
Social Media Lead Capture — NAMA OS
====================================
Facebook Lead Ads + Instagram DMs → automatic Lead records in CRM.

# Register in main.py:
# from app.api.v1 import social_webhooks as social_webhooks_router
# app.include_router(social_webhooks_router.router, prefix="/api/v1/social", tags=["social"])

Endpoints:
  GET  /api/v1/social/webhook          — Meta hub.challenge verification
  POST /api/v1/social/webhook          — Inbound Facebook Lead Ads / Instagram DM events
  POST /api/v1/social/connect          — Store Facebook Page + Instagram account credentials
  GET  /api/v1/social/status           — Connection status + leads captured count
  GET  /api/v1/social/verify-token     — Return FACEBOOK_VERIFY_TOKEN for Meta dashboard setup
"""

import os
import hashlib
import hmac
import logging
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.v1.deps import require_tenant, get_token_claims

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Config ────────────────────────────────────────────────────────────────────
FB_VERIFY_TOKEN  = lambda: os.getenv("FACEBOOK_VERIFY_TOKEN", "nama_social_verify")
FB_APP_SECRET    = lambda: os.getenv("FACEBOOK_APP_SECRET", "")
META_GRAPH_BASE  = "https://graph.facebook.com/v19.0"


# ── GET /webhook — Meta hub.challenge verification ────────────────────────────

@router.get("/webhook", response_class=PlainTextResponse)
def verify_webhook(
    hub_mode:         str = Query(None, alias="hub.mode"),
    hub_challenge:    str = Query(None, alias="hub.challenge"),
    hub_verify_token: str = Query(None, alias="hub.verify_token"),
):
    """
    Meta webhook subscription verification.
    Must return hub.challenge as plain text (not JSON) within 5 seconds.
    """
    if hub_mode == "subscribe" and hub_verify_token == FB_VERIFY_TOKEN():
        return hub_challenge
    raise HTTPException(status_code=403, detail="Verification token mismatch")


# ── POST /webhook — Inbound event handler ─────────────────────────────────────

@router.post("/webhook")
async def receive_event(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Handles inbound Meta webhook events for:
      - Facebook Lead Ads  (object="page",      entry.changes[].field="leadgen")
      - Instagram DMs      (object="instagram",  entry.messaging[].message)

    Always returns {"status": "ok"} — Meta retries on non-200 responses.
    Heavy processing is deferred to BackgroundTasks so we respond in < 1s.
    """
    try:
        body_bytes = await request.body()

        # ── HMAC-SHA256 signature validation ──────────────────────────────────
        app_secret = FB_APP_SECRET()
        if app_secret:
            sig_header = request.headers.get("X-Hub-Signature-256", "")
            expected = "sha256=" + hmac.new(
                app_secret.encode(), body_bytes, hashlib.sha256
            ).hexdigest()
            if not hmac.compare_digest(sig_header, expected):
                logger.warning("social_webhooks: invalid X-Hub-Signature-256 — dropping event")
                raise HTTPException(status_code=401, detail="Invalid signature")
        else:
            logger.warning(
                "social_webhooks: FACEBOOK_APP_SECRET not set — skipping HMAC validation (demo mode)"
            )

        payload = await request.json()
        obj_field = payload.get("object", "")

        for entry in payload.get("entry", []):
            # ── Facebook Lead Ads ─────────────────────────────────────────────
            if obj_field == "page":
                for change in entry.get("changes", []):
                    if change.get("field") == "leadgen":
                        background_tasks.add_task(_handle_lead_ad, entry, change.get("value", {}), db)

            # ── Instagram DMs ─────────────────────────────────────────────────
            elif obj_field == "instagram":
                for msg_event in entry.get("messaging", []):
                    if "message" in msg_event:
                        background_tasks.add_task(_handle_instagram_dm, entry, msg_event, db)

        return {"status": "ok"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error("social_webhooks POST /webhook error: %s", e)
        return {"status": "ok"}  # Always 200 to Meta


# ── _handle_lead_ad ────────────────────────────────────────────────────────────

async def _handle_lead_ad(entry: dict, value: dict, db: Session):
    """
    Processes a Facebook Lead Ads leadgen event.

    Flow:
      1. Extract page_id + lead_id from the webhook payload
      2. Look up tenant by facebook_page_id stored in tenant.settings
      3. Call Graph API to fetch full field_data for the lead
      4. Map field_data key/value pairs to Lead columns
      5. Create Lead(source=SOCIAL) in the matching tenant's CRM
    """
    try:
        from app.models.leads import Lead, LeadSource, LeadStatus
        from app.models.auth import Tenant

        page_id = str(value.get("page_id", entry.get("id", "")))
        lead_id = str(value.get("leadgen_id", ""))

        if not lead_id:
            logger.warning("_handle_lead_ad: missing leadgen_id in payload")
            return

        # ── Find tenant by facebook_page_id ───────────────────────────────────
        tenant = None
        all_tenants = db.query(Tenant).all()
        for t in all_tenants:
            settings = t.settings or {}
            if str(settings.get("facebook_page_id", "")) == page_id:
                tenant = t
                break

        tenant_id = tenant.id if tenant else 1  # fallback to tenant 1 (log warning)
        if not tenant:
            logger.warning(
                "_handle_lead_ad: no tenant found for page_id=%s — assigning to tenant 1",
                page_id,
            )

        # ── Fetch lead field_data from Meta Graph API ─────────────────────────
        page_access_token = ""
        if tenant:
            page_access_token = (tenant.settings or {}).get("page_access_token", "")

        field_data = []
        if page_access_token:
            try:
                async with httpx.AsyncClient() as client:
                    resp = await client.get(
                        f"{META_GRAPH_BASE}/{lead_id}",
                        params={
                            "fields": "field_data,created_time",
                            "access_token": page_access_token,
                        },
                        timeout=10.0,
                    )
                    if resp.status_code == 200:
                        field_data = resp.json().get("field_data", [])
                    else:
                        logger.warning(
                            "_handle_lead_ad: Graph API returned %s — %s",
                            resp.status_code, resp.text,
                        )
            except Exception as api_err:
                logger.error("_handle_lead_ad: Graph API call failed: %s", api_err)
        else:
            logger.info(
                "_handle_lead_ad: no page_access_token for tenant %s — creating lead without field_data",
                tenant_id,
            )

        # ── Map field_data to Lead columns ────────────────────────────────────
        # Meta returns: [{"name": "email", "values": ["user@example.com"]}, ...]
        fields: dict[str, str] = {}
        for item in field_data:
            key = (item.get("name") or "").lower().strip().replace(" ", "_")
            values = item.get("values", [])
            fields[key] = values[0] if values else ""

        # Name resolution: try full_name, then first+last concatenation
        full_name = (
            fields.get("full_name")
            or (
                " ".join(
                    filter(None, [fields.get("first_name", ""), fields.get("last_name", "")])
                )
            )
            or f"Facebook Lead {lead_id[-6:]}"
        )

        email       = fields.get("email", None)
        phone       = fields.get("phone_number", fields.get("phone", None))
        destination = fields.get("destination", None)
        travel_dates = fields.get("travel_date", fields.get("travel_dates", None))
        budget_raw  = fields.get("budget", None)
        budget_per_person: float | None = None
        if budget_raw:
            try:
                budget_per_person = float(
                    "".join(c for c in budget_raw if c.isdigit() or c == ".")
                )
            except ValueError:
                pass

        # Collect unmapped fields into notes
        known_keys = {
            "full_name", "first_name", "last_name", "email", "phone_number",
            "phone", "destination", "travel_date", "travel_dates", "budget",
        }
        extra_pairs = [
            f"{k}: {v}" for k, v in fields.items()
            if k not in known_keys and v
        ]
        notes_parts = [f"[Facebook Lead Ad — leadgen_id: {lead_id}]"]
        if extra_pairs:
            notes_parts.append("Additional fields: " + ", ".join(extra_pairs))
        notes = "\n".join(notes_parts)

        # ── Check for duplicate (same lead_id already recorded) ───────────────
        existing = (
            db.query(Lead)
            .filter(
                Lead.tenant_id == tenant_id,
                Lead.sender_id == lead_id,
            )
            .first()
        )
        if existing:
            logger.info("_handle_lead_ad: lead_id %s already exists — skipping duplicate", lead_id)
            return

        new_lead = Lead(
            tenant_id         = tenant_id,
            sender_id         = lead_id,
            source            = LeadSource.SOCIAL if hasattr(LeadSource, "SOCIAL") else LeadSource.DIRECT,
            full_name         = full_name,
            email             = email,
            phone             = phone,
            destination       = destination,
            travel_dates      = travel_dates,
            budget_per_person = budget_per_person,
            status            = LeadStatus.NEW,
            notes             = notes,
            raw_message       = str(field_data),
            triage_confidence = 0.7,
        )
        db.add(new_lead)
        db.commit()
        logger.info(
            "_handle_lead_ad: created lead id=%s for tenant %s (page_id=%s)",
            new_lead.id, tenant_id, page_id,
        )

    except Exception as e:
        logger.error("_handle_lead_ad error: %s", e)
        db.rollback()


# ── _handle_instagram_dm ───────────────────────────────────────────────────────

async def _handle_instagram_dm(entry: dict, msg_event: dict, db: Session):
    """
    Processes an Instagram Direct Message event.

    Flow:
      1. Extract sender PSID + message text from the messaging event
      2. Look up tenant by instagram_account_id stored in tenant.settings
      3. If an open lead with the same sender PSID already exists: append to notes
      4. Otherwise: create Lead(source=WHATSAPP reused for IG, or SOCIAL if available)
    """
    try:
        from app.models.leads import Lead, LeadSource, LeadStatus
        from app.models.auth import Tenant

        ig_account_id = str(entry.get("id", ""))
        sender        = msg_event.get("sender", {})
        sender_psid   = str(sender.get("id", ""))
        message_obj   = msg_event.get("message", {})
        message_text  = message_obj.get("text", "")
        timestamp_ms  = msg_event.get("timestamp", 0)

        if not sender_psid:
            logger.warning("_handle_instagram_dm: missing sender PSID — skipping")
            return

        # Ignore echo events (messages sent by the Page itself)
        if msg_event.get("sender", {}).get("id") == msg_event.get("recipient", {}).get("id"):
            return

        timestamp_str = (
            datetime.fromtimestamp(timestamp_ms / 1000, tz=timezone.utc).strftime("%d/%m %H:%M")
            if timestamp_ms
            else datetime.now(timezone.utc).strftime("%d/%m %H:%M")
        )

        # ── Find tenant by instagram_account_id ───────────────────────────────
        tenant = None
        all_tenants = db.query(Tenant).all()
        for t in all_tenants:
            settings = t.settings or {}
            if str(settings.get("instagram_account_id", "")) == ig_account_id:
                tenant = t
                break

        tenant_id = tenant.id if tenant else 1
        if not tenant:
            logger.warning(
                "_handle_instagram_dm: no tenant for ig_account_id=%s — assigning to tenant 1",
                ig_account_id,
            )

        # ── Determine source enum value ───────────────────────────────────────
        # LeadSource.SOCIAL added in this sprint; fall back to WHATSAPP if enum
        # predates this migration.
        if hasattr(LeadSource, "SOCIAL"):
            lead_source = LeadSource.SOCIAL
        else:
            lead_source = LeadSource.WHATSAPP

        # ── Check for existing open conversation with same PSID ───────────────
        existing = (
            db.query(Lead)
            .filter(
                Lead.tenant_id == tenant_id,
                Lead.sender_id == sender_psid,
                Lead.status.notin_(["WON", "LOST"]),
            )
            .first()
        )

        if existing:
            existing.notes = (
                (existing.notes or "")
                + f"\n[IG DM {timestamp_str}] {message_text}"
            )
            db.commit()
            logger.info(
                "_handle_instagram_dm: appended to existing lead %s (PSID=%s)",
                existing.id, sender_psid,
            )
        else:
            new_lead = Lead(
                tenant_id         = tenant_id,
                sender_id         = sender_psid,
                source            = lead_source,
                full_name         = f"Instagram User {sender_psid[-6:]}",
                status            = LeadStatus.NEW,
                notes             = f"[IG DM {timestamp_str}] {message_text}",
                raw_message       = message_text,
                triage_confidence = 0.4,
            )
            db.add(new_lead)
            db.commit()
            logger.info(
                "_handle_instagram_dm: created lead id=%s for tenant %s (PSID=%s)",
                new_lead.id, tenant_id, sender_psid,
            )

    except Exception as e:
        logger.error("_handle_instagram_dm error: %s", e)
        db.rollback()


# ── POST /connect ──────────────────────────────────────────────────────────────

class ConnectRequest(BaseModel):
    facebook_page_id:     str
    page_access_token:    str
    instagram_account_id: str = ""


class ConnectResponse(BaseModel):
    connected:            bool
    page_name:            str
    instagram_connected:  bool
    error:                str | None = None


@router.post("/connect", response_model=ConnectResponse)
async def connect_social(
    body:      ConnectRequest,
    tenant_id: int     = Depends(require_tenant),
    claims:    dict    = Depends(get_token_claims),
    db:        Session = Depends(get_db),
):
    """
    Stores Facebook Page ID + access token + Instagram account ID in
    tenant.settings JSONB, then verifies the token against Meta /me.

    Requires a valid JWT (R2+ recommended, but any authenticated user can connect).
    """
    from app.models.auth import Tenant

    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    # ── Verify page_access_token via Meta /me ─────────────────────────────────
    page_name = ""
    connected = False
    error_msg = None

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{META_GRAPH_BASE}/me",
                params={"access_token": body.page_access_token, "fields": "id,name"},
                timeout=10.0,
            )
            data = resp.json()
            if resp.status_code == 200 and "name" in data:
                page_name = data["name"]
                connected = True
            else:
                error_data = data.get("error", {})
                error_msg = error_data.get("message", "Token verification failed")
    except Exception as e:
        logger.error("connect_social: Meta /me request failed: %s", e)
        error_msg = f"Could not reach Meta API: {e}"

    # ── Persist to tenant.settings regardless of verification result ──────────
    # (allows saving in demo/offline mode; users can still receive webhooks if
    #  the token is correct even if /me fails due to rate limits etc.)
    settings = dict(tenant.settings or {})
    settings["facebook_page_id"]     = body.facebook_page_id
    settings["page_access_token"]    = body.page_access_token
    settings["instagram_account_id"] = body.instagram_account_id
    if page_name:
        settings["facebook_page_name"] = page_name
    tenant.settings = settings
    db.commit()

    instagram_connected = bool(body.instagram_account_id.strip())

    return ConnectResponse(
        connected           = connected,
        page_name           = page_name or body.facebook_page_id,
        instagram_connected = instagram_connected,
        error               = error_msg,
    )


# ── GET /status ────────────────────────────────────────────────────────────────

@router.get("/status")
def social_status(
    tenant_id: int     = Depends(require_tenant),
    claims:    dict    = Depends(get_token_claims),
    db:        Session = Depends(get_db),
):
    """
    Returns the social media connection status for the authenticated tenant,
    including how many leads have been captured from social sources.
    """
    from app.models.leads import Lead, LeadSource
    from app.models.auth import Tenant

    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    settings = tenant.settings or {}

    facebook_connected   = bool(settings.get("facebook_page_id"))
    instagram_connected  = bool(settings.get("instagram_account_id"))
    page_name            = settings.get("facebook_page_name", settings.get("facebook_page_id", ""))

    # Count leads from SOCIAL source (and WHATSAPP as fallback for IG DMs
    # recorded before LeadSource.SOCIAL existed)
    social_sources = []
    if hasattr(LeadSource, "SOCIAL"):
        social_sources.append(LeadSource.SOCIAL)

    leads_query = (
        db.query(Lead)
        .filter(Lead.tenant_id == tenant_id)
    )
    if social_sources:
        leads_query = leads_query.filter(Lead.source.in_(social_sources))
    else:
        # Pre-SOCIAL enum: count leads whose notes mention Facebook or Instagram
        from sqlalchemy import or_
        leads_query = leads_query.filter(
            or_(
                Lead.notes.ilike("%Facebook Lead Ad%"),
                Lead.notes.ilike("%IG DM%"),
            )
        )

    leads_captured_count = leads_query.count()

    # Last lead timestamp
    last_lead = (
        db.query(Lead.created_at)
        .filter(Lead.tenant_id == tenant_id)
        .filter(Lead.notes.ilike("%Facebook Lead Ad%") | Lead.notes.ilike("%IG DM%"))
        .order_by(Lead.created_at.desc())
        .first()
    )
    last_lead_at = last_lead[0].isoformat() if last_lead and last_lead[0] else None

    return {
        "facebook_connected":   facebook_connected,
        "page_name":            page_name,
        "instagram_connected":  instagram_connected,
        "leads_captured_count": leads_captured_count,
        "last_lead_at":         last_lead_at,
    }


# ── GET /verify-token ──────────────────────────────────────────────────────────

@router.get("/verify-token")
def get_verify_token():
    """
    Returns the FACEBOOK_VERIFY_TOKEN value for the user to enter in the
    Meta for Developers dashboard when subscribing to webhook events.
    No auth required — the token itself is not a secret (it's just a shared string
    used during the one-time webhook subscription handshake).
    """
    return {"verify_token": FB_VERIFY_TOKEN()}
