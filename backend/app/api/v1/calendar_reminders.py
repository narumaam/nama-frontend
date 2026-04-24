"""
NAMA Calendar Reminders + iCal Feed
------------------------------------
Endpoints:
  GET  /api/v1/calendar/reminders        — list tenant calendar reminders
  POST /api/v1/calendar/reminders        — create a reminder (+ optional WhatsApp)
  DELETE /api/v1/calendar/reminders/{id} — delete a reminder

  GET  /api/v1/calendar/ics-feed         — live .ics feed (subscribable URL)
  GET  /api/v1/calendar/ics-token        — generate/refresh the subscribe token

Reminder records are stored as a JSONB array in tenant.settings["calendar_reminders"].
Each reminder: { id, title, date, time, type, notes, wa_notify, created_at }

Registration (add to backend/app/main.py):
    from app.api.v1 import calendar_reminders as calendar_reminders_router
    app.include_router(
        calendar_reminders_router.router,
        prefix="/api/v1/calendar",
        tags=["calendar"],
    )
"""

import hashlib
import hmac
import logging
import os
import time
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.v1.deps import require_tenant, get_current_user
from app.models.auth import Tenant, User, UserRole

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Pydantic schemas ───────────────────────────────────────────────────────────

class ReminderCreate(BaseModel):
    title: str
    date: str                        # YYYY-MM-DD
    time: Optional[str] = "09:00"   # HH:MM (24h)
    type: Optional[str] = "manual"  # manual | follow_up | booking
    notes: Optional[str] = None
    wa_notify: bool = False          # send WhatsApp immediately if date is tomorrow


class ReminderOut(BaseModel):
    id: str
    title: str
    date: str
    time: str
    type: str
    notes: Optional[str]
    wa_notify: bool
    created_at: str


# ── Helpers ────────────────────────────────────────────────────────────────────

def _get_tenant(db: Session, tenant_id: int) -> Tenant:
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant


def _get_reminders(tenant: Tenant) -> List[Dict[str, Any]]:
    settings = tenant.settings or {}
    return list(settings.get("calendar_reminders", []))


def _save_reminders(db: Session, tenant: Tenant, reminders: List[Dict[str, Any]]) -> None:
    settings = dict(tenant.settings or {})
    settings["calendar_reminders"] = reminders
    tenant.settings = settings
    db.commit()


def _send_wa_reminder(phone: str, title: str, date: str, tenant_name: str) -> bool:
    """Send a WhatsApp reminder message. Returns True if sent (or demo mode)."""
    wa_token = os.getenv("WHATSAPP_TOKEN", "")
    wa_phone_id = os.getenv("WHATSAPP_PHONE_ID", "")

    if not wa_token or not wa_phone_id:
        logger.info("_send_wa_reminder: DEMO MODE — would send to %s", phone)
        return True

    phone_normalised = phone.replace("+", "").replace(" ", "").replace("-", "")
    message_text = (
        f"⏰ NAMA OS Reminder\n\n"
        f"📅 {date}\n"
        f"🔔 {title}\n\n"
        f"Scheduled via {tenant_name} on NAMA OS. Have a great day!"
    )

    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(
                f"https://graph.facebook.com/v19.0/{wa_phone_id}/messages",
                json={
                    "messaging_product": "whatsapp",
                    "to": phone_normalised,
                    "type": "text",
                    "text": {"body": message_text},
                },
                headers={
                    "Authorization": f"Bearer {wa_token}",
                    "Content-Type": "application/json",
                },
            )
            return resp.status_code == 200
    except Exception as exc:
        logger.error("_send_wa_reminder failed: %s", exc)
        return False


def _make_ics_token(tenant_id: int) -> str:
    """Generate a deterministic HMAC token for the iCal subscribe URL."""
    secret = os.getenv("NAMA_JWT_SECRET", "").strip()
    if not secret:
        raise RuntimeError("NAMA_JWT_SECRET must be configured for calendar token generation")
    msg = f"ical:{tenant_id}"
    return hmac.new(secret.encode(), msg.encode(), hashlib.sha256).hexdigest()[:32]


# ── Endpoints: reminders ──────────────────────────────────────────────────────

@router.get("/reminders", response_model=List[ReminderOut])
def list_reminders(
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
) -> List[ReminderOut]:
    """List all calendar reminders for the tenant."""
    tenant = _get_tenant(db, tenant_id)
    reminders = _get_reminders(tenant)
    # Sort by date desc
    reminders.sort(key=lambda r: r.get("date", ""), reverse=True)
    return [
        ReminderOut(
            id=r["id"],
            title=r["title"],
            date=r["date"],
            time=r.get("time", "09:00"),
            type=r.get("type", "manual"),
            notes=r.get("notes"),
            wa_notify=r.get("wa_notify", False),
            created_at=r.get("created_at", ""),
        )
        for r in reminders
    ]


@router.post("/reminders", response_model=ReminderOut, status_code=201)
def create_reminder(
    body: ReminderCreate,
    tenant_id: int = Depends(require_tenant),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ReminderOut:
    """
    Create a calendar reminder.

    If wa_notify=True and the reminder date is tomorrow, immediately sends
    the current user a WhatsApp message (requires WHATSAPP_TOKEN + WHATSAPP_PHONE_ID).
    """
    tenant = _get_tenant(db, tenant_id)
    reminders = _get_reminders(tenant)

    reminder_id = str(uuid.uuid4())[:16]
    now_iso = datetime.now(timezone.utc).isoformat()

    record: Dict[str, Any] = {
        "id": reminder_id,
        "title": body.title,
        "date": body.date,
        "time": body.time or "09:00",
        "type": body.type or "manual",
        "notes": body.notes,
        "wa_notify": body.wa_notify,
        "created_at": now_iso,
        "created_by": current_user.id,
    }

    reminders.append(record)
    # Cap at 500 reminders per tenant
    if len(reminders) > 500:
        reminders = reminders[-500:]

    _save_reminders(db, tenant, reminders)
    logger.info("create_reminder: tenant=%d id=%s title='%s'", tenant_id, reminder_id, body.title)

    # Optional WhatsApp notification if date is tomorrow
    if body.wa_notify:
        tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)).strftime("%Y-%m-%d")
        if body.date == tomorrow:
            phone = None
            if current_user.profile_data:
                phone = current_user.profile_data.get("phone")
            if phone:
                sent = _send_wa_reminder(phone, body.title, body.date, tenant.name)
                logger.info(
                    "create_reminder: WhatsApp %s to %s for tomorrow reminder",
                    "sent" if sent else "failed", phone,
                )

    return ReminderOut(
        id=reminder_id,
        title=record["title"],
        date=record["date"],
        time=record["time"],
        type=record["type"],
        notes=record["notes"],
        wa_notify=record["wa_notify"],
        created_at=now_iso,
    )


@router.delete("/reminders/{reminder_id}", status_code=204)
def delete_reminder(
    reminder_id: str,
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
) -> None:
    """Delete a calendar reminder by ID."""
    tenant = _get_tenant(db, tenant_id)
    reminders = _get_reminders(tenant)
    new_reminders = [r for r in reminders if r.get("id") != reminder_id]
    if len(new_reminders) == len(reminders):
        raise HTTPException(status_code=404, detail="Reminder not found")
    _save_reminders(db, tenant, new_reminders)
    logger.info("delete_reminder: tenant=%d id=%s", tenant_id, reminder_id)


# ── Endpoint: iCal token ──────────────────────────────────────────────────────

@router.get("/ics-token")
def get_ics_token(
    tenant_id: int = Depends(require_tenant),
) -> Dict[str, str]:
    """
    Return the subscribe token for the iCal feed URL.
    The URL is: GET /api/v1/calendar/ics-feed?token=<token>
    Paste this URL into Google Calendar or Outlook as a "Subscribe from URL" calendar.
    """
    token = _make_ics_token(tenant_id)
    base_url = os.getenv("NEXT_PUBLIC_API_URL", "https://intuitive-blessing-production-30de.up.railway.app")
    subscribe_url = f"{base_url}/api/v1/calendar/ics-feed?token={token}"
    return {"token": token, "subscribe_url": subscribe_url}


# ── Endpoint: iCal feed ───────────────────────────────────────────────────────

@router.get("/ics-feed")
def get_ics_feed(
    token: str = Query(..., description="Subscribe token from GET /calendar/ics-token"),
    db: Session = Depends(get_db),
) -> Response:
    """
    Returns a live iCalendar (.ics) feed containing all bookings and reminders
    for the tenant identified by the token.

    This URL can be subscribed to in Google Calendar, Outlook, or Apple Calendar:
      - Google Calendar → Other calendars → From URL
      - Outlook         → Add calendar → Subscribe from web
      - Apple Calendar  → File → New Calendar Subscription
    """
    # Resolve tenant from token
    # We try all tenants and check the HMAC — O(tenants) but this endpoint
    # is called by calendar clients periodically (not hot path).
    from sqlalchemy import or_
    tenants = db.query(Tenant).filter(Tenant.status == "ACTIVE").limit(500).all()
    matched_tenant: Optional[Tenant] = None
    for t in tenants:
        if _make_ics_token(t.id) == token:
            matched_tenant = t
            break

    if not matched_tenant:
        raise HTTPException(status_code=403, detail="Invalid or expired subscribe token")

    tenant_id = matched_tenant.id
    now = datetime.now(timezone.utc)

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//NAMA OS//Travel Calendar//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        f"X-WR-CALNAME:NAMA OS — {matched_tenant.name}",
        "X-WR-TIMEZONE:Asia/Kolkata",
        "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
        "X-PUBLISHED-TTL:PT1H",
    ]

    # 1. Bookings
    try:
        from app.models.bookings import Booking

        bookings = (
            db.query(Booking)
            .filter(Booking.tenant_id == tenant_id)
            .limit(500)
            .all()
        )
        for b in bookings:
            event_date = None
            if b.items:
                try:
                    first_item = sorted(b.items, key=lambda i: i.start_date)[0]
                    event_date = first_item.start_date.strftime("%Y%m%d")
                except Exception:
                    pass
            if not event_date and b.created_at:
                event_date = b.created_at.strftime("%Y%m%d")
            if not event_date:
                continue

            lead_name = "Booking"
            destination = ""
            if b.lead:
                lead_name = (b.lead.full_name or f"Lead #{b.lead_id}").replace(",", " ").replace(";", " ")
                destination = (b.lead.destination or "").replace(",", " ").replace(";", " ")

            status_val = b.status.value if b.status else "DRAFT"
            amount = f"₹{b.total_price:,.0f}" if b.total_price else ""
            dtstamp = now.strftime("%Y%m%dT%H%M%SZ")
            uid = f"booking_{b.id}@getnama.app"

            summary = f"✈ {lead_name}"
            if destination:
                summary += f" — {destination}"
            description = " | ".join(filter(None, [destination, f"Status: {status_val}", amount]))

            lines += [
                "BEGIN:VEVENT",
                f"UID:{uid}",
                f"DTSTAMP:{dtstamp}",
                f"DTSTART;VALUE=DATE:{event_date}",
                f"DTEND;VALUE=DATE:{event_date}",
                f"SUMMARY:{summary}",
                f"DESCRIPTION:{description}",
                f"URL:https://getnama.app/dashboard/bookings",
                "CATEGORIES:BOOKING",
                "END:VEVENT",
            ]
    except Exception as exc:
        logger.warning("ics-feed: bookings query failed: %s", exc)

    # 2. Calendar reminders (manual + routine-created)
    try:
        reminders = _get_reminders(matched_tenant)
        for r in reminders:
            date_str = r.get("date", "")
            if not date_str:
                continue
            try:
                date_obj = datetime.strptime(date_str, "%Y-%m-%d")
                ical_date = date_obj.strftime("%Y%m%d")
            except ValueError:
                continue

            title = (r.get("title") or "Reminder").replace(",", " ").replace(";", " ")
            notes = (r.get("notes") or "").replace(",", " ").replace(";", " ")
            dtstamp = now.strftime("%Y%m%dT%H%M%SZ")
            uid = f"reminder_{r.get('id', '')}@getnama.app"
            time_str = r.get("time", "09:00")

            # If time is specified, make it a DATETIME event at the given local time
            try:
                h, m = map(int, time_str.split(":"))
                dt_local = date_obj.replace(hour=h, minute=m, second=0)
                # IST offset +05:30 → store as TZID
                dtstart = f"DTSTART;TZID=Asia/Kolkata:{dt_local.strftime('%Y%m%dT%H%M%S')}"
                dtend_dt = dt_local + timedelta(hours=1)
                dtend = f"DTEND;TZID=Asia/Kolkata:{dtend_dt.strftime('%Y%m%dT%H%M%S')}"
            except Exception:
                dtstart = f"DTSTART;VALUE=DATE:{ical_date}"
                dtend = f"DTEND;VALUE=DATE:{ical_date}"

            lines += [
                "BEGIN:VEVENT",
                f"UID:{uid}",
                f"DTSTAMP:{dtstamp}",
                dtstart,
                dtend,
                f"SUMMARY:🔔 {title}",
                f"DESCRIPTION:{notes}" if notes else "DESCRIPTION:",
                "URL:https://getnama.app/dashboard/calendar",
                "CATEGORIES:REMINDER",
                "END:VEVENT",
            ]
    except Exception as exc:
        logger.warning("ics-feed: reminders query failed: %s", exc)

    lines.append("END:VCALENDAR")

    ical_content = "\r\n".join(lines) + "\r\n"
    return Response(
        content=ical_content,
        media_type="text/calendar; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="nama-{matched_tenant.name.lower().replace(" ", "-")}.ics"',
            "Cache-Control": "no-cache, must-revalidate",
        },
    )
