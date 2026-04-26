"""
HS-3: Payment Endpoints — Webhook Receivers + Payment Status + Razorpay Payment Links
--------------------------------------------------------------------------------------
HS-3 Acceptance Gates wired here:
  ✓ Stripe webhook: verify HMAC signature → 400 if invalid
  ✓ Razorpay webhook: verify HMAC signature → 400 if invalid
  ✓ Both webhooks write event to DB before any processing (at-least-once)
  ✓ No sync payment processing in HTTP handler
"""

import os
import json
import requests as _requests
from fastapi import APIRouter, Depends, HTTPException, Request, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel

from app.db.session import get_db
from app.api.v1.deps import require_tenant, get_token_claims
from app.models.payments import Payment, PaymentStatus, PaymentProvider, LedgerEntry
from app.core.payments import (
    verify_stripe_signature,
    verify_razorpay_webhook_signature,
    persist_webhook_event,
)
from app.core.rls import tenant_query

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class PaymentOut(BaseModel):
    id: int
    booking_id: int
    tenant_id: int
    idempotency_key: str
    amount: float
    currency: str
    provider: str
    provider_ref: Optional[str] = None
    status: str
    failure_reason: Optional[str] = None

    class Config:
        from_attributes = True


class LedgerEntryOut(BaseModel):
    id: int
    entry_type: str
    amount: float
    currency: str
    description: str
    reference: Optional[str] = None

    class Config:
        from_attributes = True


# ── Payment status ─────────────────────────────────────────────────────────────

@router.get("/booking/{booking_id}", response_model=PaymentOut)
def get_payment_for_booking(
    booking_id: int,
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
):
    """Fetch payment record for a booking — tenant-scoped."""
    payment = (
        db.query(Payment)
        .filter(Payment.booking_id == booking_id, Payment.tenant_id == tenant_id)
        .order_by(Payment.created_at.desc())
        .first()
    )
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return payment


@router.get("/ledger", response_model=list[LedgerEntryOut])
def get_ledger(
    booking_id: Optional[int] = None,
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
):
    """Ledger entries for this tenant, optionally filtered by booking."""
    q = db.query(LedgerEntry).filter(LedgerEntry.tenant_id == tenant_id)
    if booking_id:
        q = q.filter(LedgerEntry.booking_id == booking_id)
    return q.order_by(LedgerEntry.created_at.desc()).all()


# ── Stripe webhook ────────────────────────────────────────────────────────────

@router.post("/webhooks/stripe", status_code=status.HTTP_200_OK)
async def stripe_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    HS-3: Stripe webhook receiver.
      1. Verify HMAC signature — 400 if invalid (gate: no processing of tampered events)
      2. Persist event to DB before any processing
      3. Enqueue background processing — HTTP handler returns 200 immediately

    Acceptance Gate: invalid Stripe-Signature header → HTTP 400, nothing processed.
    """
    body = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    # Gate: reject if signature invalid
    if not verify_stripe_signature(body, sig_header):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Stripe webhook signature",
        )

    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event_id = payload.get("id", "")
    event_type = payload.get("type", "")

    # Persist event — idempotent, returns None if already seen
    event = persist_webhook_event(db, PaymentProvider.STRIPE, event_id, event_type, payload)
    if event is None:
        return {"status": "already_processed"}

    # Enqueue processing (non-blocking)
    background_tasks.add_task(_handle_stripe_event, event.id, payload)

    return {"status": "queued", "event_id": event_id}


def _handle_stripe_event(event_db_id: int, payload: dict) -> None:
    """
    Background handler for Stripe events.
    Called after the HTTP response is sent — never blocks the webhook handler.
    """
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    import os

    engine = create_engine(os.getenv("DATABASE_URL", ""))
    db = sessionmaker(bind=engine)()
    try:
        from app.models.payments import WebhookEvent
        from datetime import datetime, timezone

        event_type = payload.get("type", "")
        data = payload.get("data", {}).get("object", {})

        if event_type == "payment_intent.succeeded":
            provider_ref = data.get("id")
            payment = db.query(Payment).filter(Payment.provider_ref == provider_ref).first()
            if payment:
                payment.status = PaymentStatus.COMPLETED

                from app.models.bookings import Booking as BookingModel
                from app.schemas.bookings import BookingStatus
                booking = db.query(BookingModel).filter(BookingModel.id == payment.booking_id).first()
                if booking:
                    booking.status = BookingStatus.CONFIRMED.value

                db.add(LedgerEntry(
                    tenant_id=payment.tenant_id,
                    booking_id=payment.booking_id,
                    payment_id=payment.id,
                    entry_type="CREDIT",
                    amount=payment.amount,
                    currency=payment.currency,
                    description=f"Stripe payment confirmed: {provider_ref}",
                    reference=provider_ref,
                ))

        elif event_type == "payment_intent.payment_failed":
            provider_ref = data.get("id")
            error_msg = data.get("last_payment_error", {}).get("message", "Unknown error")
            payment = db.query(Payment).filter(Payment.provider_ref == provider_ref).first()
            if payment:
                payment.status = PaymentStatus.FAILED
                payment.failure_reason = error_msg

                from app.models.bookings import Booking as BookingModel
                from app.schemas.bookings import BookingStatus
                booking = db.query(BookingModel).filter(BookingModel.id == payment.booking_id).first()
                if booking:
                    booking.status = BookingStatus.CANCELLED.value  # Compensating transaction

        # Mark event as processed
        we = db.query(WebhookEvent).filter(WebhookEvent.id == event_db_id).first()
        if we:
            we.processed = True
            we.processed_at = datetime.now(timezone.utc)

        db.commit()
    except Exception as exc:
        db.rollback()
        # In production: increment attempts, alert if attempts > 5
        print(f"[STRIPE HANDLER] Error processing event {event_db_id}: {exc}")
    finally:
        db.close()


# ── Razorpay webhook ──────────────────────────────────────────────────────────

@router.post("/webhooks/razorpay", status_code=status.HTTP_200_OK)
async def razorpay_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    HS-3: Razorpay webhook receiver.
    Same pattern as Stripe: verify → persist → enqueue → return 200.

    Acceptance Gate: missing/invalid X-Razorpay-Signature → HTTP 400.
    """
    body = await request.body()

    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    # Razorpay webhooks are signed with HMAC-SHA256 over the RAW request body
    # (not over individual fields). The signature is in X-Razorpay-Signature.
    # See: https://razorpay.com/docs/webhooks/validate-test/
    event_type = payload.get("event", "")
    payment_data = payload.get("payload", {}).get("payment", {}).get("entity", {})
    order_id = payment_data.get("order_id", "")
    payment_id = payment_data.get("id", "")
    signature = request.headers.get("x-razorpay-signature", "")

    # Gate: reject if signature invalid. We pass the RAW body bytes captured
    # at line 224, before json.loads — even whitespace differences would
    # break the HMAC comparison.
    if not verify_razorpay_webhook_signature(body, signature):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Razorpay webhook signature",
        )

    event_id = f"rp_{order_id}_{payment_id}_{event_type}"
    event = persist_webhook_event(db, PaymentProvider.RAZORPAY, event_id, event_type, payload)
    if event is None:
        return {"status": "already_processed"}

    background_tasks.add_task(_handle_razorpay_event, event.id, payload)
    return {"status": "queued", "event_id": event_id}


def _handle_razorpay_event(event_db_id: int, payload: dict) -> None:
    """Background handler for Razorpay events — mirrors Stripe handler structure."""
    import os
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from datetime import datetime, timezone

    engine = create_engine(os.getenv("DATABASE_URL", ""))
    db = sessionmaker(bind=engine)()
    try:
        event_type = payload.get("event", "")
        payment_data = payload.get("payload", {}).get("payment", {}).get("entity", {})
        provider_ref = payment_data.get("id")

        payment = db.query(Payment).filter(Payment.provider_ref == provider_ref).first()
        if payment:
            from app.models.bookings import Booking as BookingModel
            from app.schemas.bookings import BookingStatus

            if event_type == "payment.captured":
                payment.status = PaymentStatus.COMPLETED
                booking = db.query(BookingModel).filter(BookingModel.id == payment.booking_id).first()
                if booking:
                    booking.status = BookingStatus.CONFIRMED.value
                db.add(LedgerEntry(
                    tenant_id=payment.tenant_id,
                    booking_id=payment.booking_id,
                    payment_id=payment.id,
                    entry_type="CREDIT",
                    amount=payment.amount,
                    currency=payment.currency,
                    description=f"Razorpay payment captured: {provider_ref}",
                    reference=provider_ref,
                ))
            elif event_type == "payment.failed":
                payment.status = PaymentStatus.FAILED
                payment.failure_reason = payment_data.get("error_description", "Payment failed")
                booking = db.query(BookingModel).filter(BookingModel.id == payment.booking_id).first()
                if booking:
                    booking.status = BookingStatus.CANCELLED.value  # Compensating transaction

        from app.models.payments import WebhookEvent
        we = db.query(WebhookEvent).filter(WebhookEvent.id == event_db_id).first()
        if we:
            we.processed = True
            we.processed_at = datetime.now(timezone.utc)

        db.commit()
    except Exception as exc:
        db.rollback()
        print(f"[RAZORPAY HANDLER] Error processing event {event_db_id}: {exc}")
    finally:
        db.close()


# ── Razorpay Payment Links ─────────────────────────────────────────────────────

_RAZORPAY_KEY_ID     = os.getenv("RAZORPAY_KEY_ID", "")
_RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")
_FRONTEND_URL        = os.getenv("FRONTEND_URL", "https://getnama.app")


class CreatePaymentLinkRequest(BaseModel):
    quotation_id: int
    amount: float         # in INR (will convert to paise)
    description: str
    currency: str = "INR"


class PaymentLinkResponse(BaseModel):
    payment_link_url: str
    payment_link_id: str
    demo: bool = False


@router.post("/create-link", response_model=PaymentLinkResponse)
def create_payment_link(
    body: CreatePaymentLinkRequest,
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
) -> PaymentLinkResponse:
    """
    Create a Razorpay payment link for collecting a deposit on a quotation.
    Falls back to a demo link when RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set.
    """
    # Demo mode — no Razorpay keys configured
    if not _RAZORPAY_KEY_ID or not _RAZORPAY_KEY_SECRET:
        return PaymentLinkResponse(
            payment_link_url="https://rzp.io/l/demo-nama",
            payment_link_id="demo_link_001",
            demo=True,
        )

    payload = {
        "amount": int(body.amount * 100),   # paise
        "currency": body.currency,
        "description": body.description,
        "callback_url": f"{_FRONTEND_URL}/dashboard/bookings",
        "callback_method": "get",
    }
    try:
        response = _requests.post(
            "https://api.razorpay.com/v1/payment_links",
            json=payload,
            auth=(_RAZORPAY_KEY_ID, _RAZORPAY_KEY_SECRET),
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()
        return PaymentLinkResponse(
            payment_link_url=data["short_url"],
            payment_link_id=data["id"],
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Razorpay error: {exc}")
