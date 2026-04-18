"""
NAMA Payment Gateway Adapters — Stripe & Razorpay (Task #17 / HS-3)
=====================================================================
Provides a unified GatewayResult interface over two real payment gateways:

  StripeAdapter   → uses stripe-python SDK
  RazorpayAdapter → uses razorpay-python SDK
  MockAdapter     → used in dev/test when no keys configured

Selection priority (per invocation):
  1. Explicit `provider` arg
  2. PAYMENT_GATEWAY env var ("stripe" | "razorpay")
  3. Defaults to MockAdapter (dev-safe)

Usage:
  from app.core.payment_gateways import get_gateway, GatewayResult

  adapter = get_gateway("razorpay")        # or "stripe"
  result  = adapter.create_order(amount=185000, currency="INR", ref="BK-00042")
  if result.success:
      print(result.provider_ref)           # Razorpay order_id / Stripe PaymentIntent id
"""
from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class GatewayResult:
    success: bool
    provider_ref: Optional[str] = None   # Stripe PI id / Razorpay order id
    error: Optional[str] = None
    raw: Optional[dict] = None           # Full gateway response (for audit log)


class StripeAdapter:
    """
    Stripe PaymentIntents adapter.
    Requires env var: STRIPE_SECRET_KEY
    Optional:         STRIPE_WEBHOOK_SECRET (for webhook verification — see payments.py)
    """

    def __init__(self):
        self.api_key = os.getenv("STRIPE_SECRET_KEY", "")
        if not self.api_key:
            logger.warning("[Stripe] STRIPE_SECRET_KEY not set — adapter will fail on live calls")

    def create_order(
        self,
        amount: float,
        currency: str,
        ref: str,
        metadata: Optional[dict] = None,
    ) -> GatewayResult:
        """
        Create a Stripe PaymentIntent.
        `amount` is in the smallest currency unit (paise for INR, cents for USD).
        We multiply by 100 internally.
        """
        if not self.api_key:
            return GatewayResult(success=False, error="STRIPE_SECRET_KEY not configured")

        try:
            import stripe
            stripe.api_key = self.api_key

            intent = stripe.PaymentIntent.create(
                amount=int(amount * 100),     # paise / cents
                currency=currency.lower(),
                idempotency_key=ref,
                metadata=metadata or {"booking_ref": ref},
                description=f"NAMA booking {ref}",
            )
            return GatewayResult(
                success=True,
                provider_ref=intent["id"],
                raw=dict(intent),
            )
        except Exception as exc:
            logger.error(f"[Stripe] create_order failed: {exc}")
            return GatewayResult(success=False, error=str(exc))

    def capture(self, provider_ref: str, amount: float) -> GatewayResult:
        """Capture a previously authorised PaymentIntent."""
        if not self.api_key:
            return GatewayResult(success=False, error="STRIPE_SECRET_KEY not configured")
        try:
            import stripe
            stripe.api_key = self.api_key
            intent = stripe.PaymentIntent.capture(provider_ref, amount_to_capture=int(amount * 100))
            return GatewayResult(success=True, provider_ref=intent["id"], raw=dict(intent))
        except Exception as exc:
            logger.error(f"[Stripe] capture failed: {exc}")
            return GatewayResult(success=False, error=str(exc))

    def refund(self, provider_ref: str, amount: float) -> GatewayResult:
        """Issue a full or partial refund on a PaymentIntent."""
        if not self.api_key:
            return GatewayResult(success=False, error="STRIPE_SECRET_KEY not configured")
        try:
            import stripe
            stripe.api_key = self.api_key
            refund = stripe.Refund.create(payment_intent=provider_ref, amount=int(amount * 100))
            return GatewayResult(success=True, provider_ref=refund["id"], raw=dict(refund))
        except Exception as exc:
            logger.error(f"[Stripe] refund failed: {exc}")
            return GatewayResult(success=False, error=str(exc))


class RazorpayAdapter:
    """
    Razorpay Orders + Payments adapter.
    Requires env vars: RAZORPAY_KEY_ID  and  RAZORPAY_KEY_SECRET
    Optional:          RAZORPAY_WEBHOOK_SECRET (for webhook verification — see payments.py)
    """

    def __init__(self):
        self.key_id     = os.getenv("RAZORPAY_KEY_ID", "")
        self.key_secret = os.getenv("RAZORPAY_KEY_SECRET", "")
        if not self.key_id or not self.key_secret:
            logger.warning("[Razorpay] RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set")

    def _client(self):
        import razorpay
        return razorpay.Client(auth=(self.key_id, self.key_secret))

    def create_order(
        self,
        amount: float,
        currency: str,
        ref: str,
        metadata: Optional[dict] = None,
    ) -> GatewayResult:
        """
        Create a Razorpay Order.
        `amount` in smallest unit (paise for INR).
        """
        if not self.key_id or not self.key_secret:
            return GatewayResult(success=False, error="RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not configured")

        try:
            client = self._client()
            order = client.order.create({
                "amount":   int(amount * 100),
                "currency": currency.upper(),
                "receipt":  ref[:40],          # Razorpay receipt max 40 chars
                "notes":    metadata or {"booking_ref": ref},
            })
            return GatewayResult(
                success=True,
                provider_ref=order["id"],
                raw=dict(order),
            )
        except Exception as exc:
            logger.error(f"[Razorpay] create_order failed: {exc}")
            return GatewayResult(success=False, error=str(exc))

    def fetch_payment(self, payment_id: str) -> GatewayResult:
        """Fetch a Razorpay Payment to confirm its status."""
        if not self.key_id:
            return GatewayResult(success=False, error="Not configured")
        try:
            client = self._client()
            payment = client.payment.fetch(payment_id)
            captured = payment.get("status") == "captured"
            return GatewayResult(
                success=captured,
                provider_ref=payment["id"],
                raw=dict(payment),
                error=None if captured else f"Payment status: {payment.get('status')}",
            )
        except Exception as exc:
            logger.error(f"[Razorpay] fetch_payment failed: {exc}")
            return GatewayResult(success=False, error=str(exc))

    def refund(self, payment_id: str, amount: float) -> GatewayResult:
        """Issue a refund on a Razorpay payment."""
        if not self.key_id:
            return GatewayResult(success=False, error="Not configured")
        try:
            client = self._client()
            refund = client.payment.refund(payment_id, {"amount": int(amount * 100)})
            return GatewayResult(success=True, provider_ref=refund["id"], raw=dict(refund))
        except Exception as exc:
            logger.error(f"[Razorpay] refund failed: {exc}")
            return GatewayResult(success=False, error=str(exc))


class MockAdapter:
    """
    Dev/test adapter — always succeeds, no real API calls.
    Used automatically when neither STRIPE_SECRET_KEY nor RAZORPAY_KEY_ID is set.
    """

    def create_order(self, amount: float, currency: str, ref: str, **_) -> GatewayResult:
        logger.info(f"[MockGateway] create_order amount={amount} {currency} ref={ref}")
        return GatewayResult(
            success=amount <= 10_000_000,
            provider_ref=f"mock_pi_{ref[:20]}",
            error=None if amount <= 10_000_000 else "Mock: amount too large",
        )

    def refund(self, *_, **__) -> GatewayResult:
        return GatewayResult(success=True, provider_ref="mock_refund_ok")


def get_gateway(provider: Optional[str] = None, db=None, tenant_id: Optional[int] = None):
    """
    Return the configured payment gateway adapter.

    Credential resolution priority:
      1. Tenant-level BYOK keys stored in byok_api_keys table (if db + tenant_id provided)
      2. Env vars (STRIPE_SECRET_KEY / RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET)
      3. MockAdapter (dev-safe fallback)

    Provider selection priority:
      1. Explicit `provider` arg
      2. PAYMENT_GATEWAY env var ("stripe" | "razorpay")
      3. First active gateway key found in tenant's BYOK table
    """
    selected = (provider or os.getenv("PAYMENT_GATEWAY", "")).lower().strip()

    # Try to resolve from tenant BYOK table
    if db is not None and tenant_id is not None:
        try:
            from app.api.v1.settings import ByokApiKey, _decrypt  # lazy import
            _decrypt_key = _decrypt
            # If no explicit provider, pick first active payment gateway key
            if not selected or selected not in ("stripe", "razorpay"):
                for prov in ("razorpay", "stripe"):
                    key_row = (
                        db.query(ByokApiKey)
                        .filter(
                            ByokApiKey.tenant_id == tenant_id,
                            ByokApiKey.provider == prov,
                            ByokApiKey.is_active == True,
                        )
                        .first()
                    )
                    if key_row:
                        selected = prov
                        break

            if selected == "stripe":
                key_row = (
                    db.query(ByokApiKey)
                    .filter(
                        ByokApiKey.tenant_id == tenant_id,
                        ByokApiKey.provider == "stripe",
                        ByokApiKey.is_active == True,
                    )
                    .first()
                )
                if key_row:
                    adapter = StripeAdapter()
                    adapter.api_key = _decrypt_key(key_row.key_encrypted)
                    return adapter

            elif selected == "razorpay":
                # Razorpay needs key_id and key_secret — stored as JSON in key_encrypted
                key_row = (
                    db.query(ByokApiKey)
                    .filter(
                        ByokApiKey.tenant_id == tenant_id,
                        ByokApiKey.provider == "razorpay",
                        ByokApiKey.is_active == True,
                    )
                    .first()
                )
                if key_row:
                    import json as _json
                    creds = _json.loads(_decrypt_key(key_row.key_encrypted))
                    adapter = RazorpayAdapter()
                    adapter.key_id     = creds.get("key_id", "")
                    adapter.key_secret = creds.get("key_secret", "")
                    return adapter
        except Exception as exc:
            logger.warning(f"[GatewayFactory] Could not load tenant BYOK key: {exc}")

    # Fall back to env vars
    if not selected:
        selected = os.getenv("PAYMENT_GATEWAY", "mock").lower().strip()

    if selected == "stripe":
        return StripeAdapter()
    if selected == "razorpay":
        return RazorpayAdapter()
    return MockAdapter()

