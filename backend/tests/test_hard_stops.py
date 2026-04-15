"""
Hard Stop Acceptance Gate Tests
=================================
Run with:  pytest tests/test_hard_stops.py -v

These tests verify the binary pass/fail criteria for all 4 Hard Stops
as defined in the NAMA Implementation Roadmap.

Requirements:
  pip install pytest pytest-asyncio httpx
  Set DATABASE_URL to a test PostgreSQL or SQLite database.
"""

import os
import pytest
import asyncio
from unittest.mock import patch, MagicMock

# Use SQLite for unit tests (no Postgres needed)
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_nama.db")
os.environ.setdefault("SECRET_KEY", "test-secret-key-32-chars-minimum!!")
os.environ.setdefault("REFRESH_SECRET_KEY", "test-refresh-key-32-chars-minimum!")


# ─────────────────────────────────────────────────────────────────────────────
# Test Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _ensure_stub_tables():
    """
    Import all real models so Base.metadata has complete FK references before
    create_all() is called.

    All tables that were previously stubbed (leads, itineraries, vendors) now
    have real SQLAlchemy models, so no stub Table() registrations are needed.
    Models must be imported in FK dependency order to avoid mapper init errors.
    """
    import app.models.auth        # noqa: F401  — tenants, users
    import app.models.leads       # noqa: F401  — leads (M2)
    import app.models.itineraries # noqa: F401  — itineraries (M8)
    import app.models.vendors     # noqa: F401  — vendors, vendor_rates (M6)
    import app.models.bookings    # noqa: F401  — bookings, booking_items (M7)
    import app.models.payments    # noqa: F401  — payments, webhook_events, ledger_entries (HS-3)
    import app.models.ai_usage    # noqa: F401  — ai_usage, tenant_ai_budgets (HS-4)


def _make_test_engine_and_session():
    """Create a fresh in-memory SQLite engine + session with all stubs registered."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.db.session import Base

    _ensure_stub_tables()
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    return engine, Session


# ─────────────────────────────────────────────────────────────────────────────
# HS-1: Authentication
# ─────────────────────────────────────────────────────────────────────────────

class TestHS1Authentication:
    """
    Acceptance Gate — HS-1:
      ✓ JWT payload contains user_id, tenant_id, role on every token
      ✓ Expired/tampered token raises JWTError
      ✓ Refresh token decodes independently with correct claims
      ✓ Passwords are hashed (bcrypt), never stored plaintext
    """

    def test_access_token_contains_required_claims(self):
        from app.core.security import create_access_token, decode_access_token
        token = create_access_token(user_id=42, tenant_id=7, role="R2_ORG_ADMIN", email="test@example.com")
        claims = decode_access_token(token)
        assert claims["user_id"] == 42,          "HS-1 FAIL: user_id missing from JWT"
        assert claims["tenant_id"] == 7,         "HS-1 FAIL: tenant_id missing from JWT"
        assert claims["role"] == "R2_ORG_ADMIN", "HS-1 FAIL: role missing from JWT"
        assert claims["sub"] == "test@example.com", "HS-1 FAIL: sub (email) missing from JWT"
        assert claims["type"] == "access",       "HS-1 FAIL: token type must be 'access'"

    def test_refresh_token_contains_required_claims(self):
        from app.core.security import create_refresh_token, decode_refresh_token
        token = create_refresh_token(user_id=42, tenant_id=7, role="R2_ORG_ADMIN", email="test@example.com")
        claims = decode_refresh_token(token)
        assert claims["user_id"] == 42
        assert claims["tenant_id"] == 7
        assert claims["type"] == "refresh", "HS-1 FAIL: refresh token must have type='refresh'"

    def test_tampered_token_raises_error(self):
        from app.core.security import create_access_token, decode_access_token
        from jose import JWTError
        token = create_access_token(user_id=1, tenant_id=1, role="R4", email="a@b.com")
        tampered = token[:-5] + "XXXXX"
        with pytest.raises(JWTError):
            decode_access_token(tampered)

    def test_access_token_rejected_as_refresh(self):
        """Cross-token-type usage must be rejected."""
        from app.core.security import create_access_token, decode_refresh_token
        from jose import JWTError
        access = create_access_token(user_id=1, tenant_id=1, role="R4", email="a@b.com")
        with pytest.raises(JWTError):
            decode_refresh_token(access)   # type check must fail

    def test_password_is_hashed_not_plaintext(self):
        from app.core.security import hash_password, verify_password
        hashed = hash_password("SecurePass123!")
        assert hashed != "SecurePass123!", "HS-1 FAIL: password stored as plaintext"
        assert hashed.startswith("$2b$"),  "HS-1 FAIL: password not bcrypt hashed"
        assert verify_password("SecurePass123!", hashed), "HS-1 FAIL: correct password rejected"
        assert not verify_password("WrongPassword", hashed), "HS-1 FAIL: wrong password accepted"

    def test_missing_claim_raises_error(self):
        """Token without tenant_id must be rejected."""
        import time
        from jose import jwt
        from app.core.security import SECRET_KEY, ALGORITHM, decode_access_token, JWTError
        # Manually craft a token missing tenant_id
        bad_payload = {"sub": "a@b.com", "user_id": 1, "role": "R4",
                       "type": "access", "exp": time.time() + 900, "iat": time.time()}
        bad_token = jwt.encode(bad_payload, SECRET_KEY, algorithm=ALGORITHM)
        with pytest.raises(JWTError):
            decode_access_token(bad_token)


# ─────────────────────────────────────────────────────────────────────────────
# HS-2: Row Level Security
# ─────────────────────────────────────────────────────────────────────────────

class TestHS2RLS:
    """
    Acceptance Gate — HS-2:
      ✓ tenant_query() adds tenant_id filter to every query
      ✓ get_or_404() returns 404 (not data) for cross-tenant access
      ✓ require_tenant() reads tenant_id from JWT (not request body)
    """

    def test_tenant_query_filters_by_tenant(self):
        """Verify tenant_query builds a query with tenant_id filter."""
        from app.core.rls import tenant_query
        from app.models.bookings import Booking

        _, Session = _make_test_engine_and_session()
        db = Session()

        q = tenant_query(db, Booking, tenant_id=5)
        sql = str(q.statement.compile(compile_kwargs={"literal_binds": True}))
        assert "5" in sql, "HS-2 FAIL: tenant_id=5 not present in query WHERE clause"
        db.close()

    def test_get_or_404_cross_tenant_returns_404(self):
        """Resource belonging to tenant 1 must not be visible to tenant 2."""
        from app.core.rls import get_or_404
        from app.models.bookings import Booking
        from app.schemas.bookings import BookingStatus
        from fastapi import HTTPException

        _, Session = _make_test_engine_and_session()
        db = Session()

        # Seed a booking for tenant 1
        b = Booking(itinerary_id=1, tenant_id=1, lead_id=1,
                    status=BookingStatus.DRAFT.value, total_price=1000.0, currency="INR")
        db.add(b)
        db.commit()

        # Tenant 2 tries to access tenant 1's booking → must get 404
        with pytest.raises(HTTPException) as exc_info:
            get_or_404(db, Booking, resource_id=b.id, tenant_id=2)
        assert exc_info.value.status_code == 404, "HS-2 FAIL: cross-tenant access must return 404"
        db.close()

    def test_require_tenant_reads_from_jwt_not_body(self):
        """require_tenant() depends on get_token_claims, not any request body."""
        import inspect
        from app.api.v1.deps import require_tenant

        source = inspect.getsource(require_tenant)
        assert "get_token_claims" in source, "HS-2 FAIL: require_tenant must use get_token_claims"
        assert "Body" not in source, "HS-2 FAIL: require_tenant must not read from request body"


# ─────────────────────────────────────────────────────────────────────────────
# HS-3: Payment Safety
# ─────────────────────────────────────────────────────────────────────────────

class TestHS3PaymentSafety:
    """
    Acceptance Gate — HS-3:
      ✓ Duplicate idempotency key → existing booking returned, not duplicate created
      ✓ Invalid Stripe signature → verify_stripe_signature returns False
      ✓ Invalid Razorpay signature → verify_razorpay_signature returns False
      ✓ Payment failure → booking moves to CANCELLED (compensating transaction)
      ✓ Webhook events persisted before processing; duplicate event_id silently skipped
    """

    def test_idempotency_key_is_unique_field(self):
        """Payment model must have idempotency_key as unique column."""
        from app.models.payments import Payment
        cols = {c.name: c for c in Payment.__table__.columns}
        assert "idempotency_key" in cols, "HS-3 FAIL: idempotency_key column missing"
        assert cols["idempotency_key"].unique, "HS-3 FAIL: idempotency_key must be UNIQUE"

    def test_stripe_invalid_signature_rejected(self):
        from app.core.payments import verify_stripe_signature
        result = verify_stripe_signature(b'{"id":"evt_test"}', "t=123,v1=invalidsig")
        assert result is False, "HS-3 FAIL: invalid Stripe signature must return False"

    def test_razorpay_invalid_signature_rejected(self):
        from app.core.payments import verify_razorpay_signature
        result = verify_razorpay_signature("order_abc", "pay_xyz", "badsignature")
        assert result is False, "HS-3 FAIL: invalid Razorpay signature must return False"

    def test_webhook_event_persisted_before_processing(self):
        """persist_webhook_event writes row; duplicate event_id returns None."""
        from app.core.payments import persist_webhook_event
        from app.models.payments import PaymentProvider

        _, Session = _make_test_engine_and_session()
        db = Session()

        event = persist_webhook_event(
            db, PaymentProvider.STRIPE, "evt_001",
            "payment_intent.succeeded", {"id": "evt_001"}
        )
        assert event is not None,          "HS-3 FAIL: webhook event not persisted"
        assert event.processed is False,   "HS-3 FAIL: event should not be marked processed immediately"

        # Duplicate event_id must return None (idempotent delivery)
        duplicate = persist_webhook_event(
            db, PaymentProvider.STRIPE, "evt_001",
            "payment_intent.succeeded", {}
        )
        assert duplicate is None, "HS-3 FAIL: duplicate event_id must return None (idempotent)"
        db.close()

    def test_build_idempotency_key_is_deterministic(self):
        """Same inputs must always produce same key."""
        from app.core.payments import build_idempotency_key
        k1 = build_idempotency_key(booking_id=42, attempt=1)
        k2 = build_idempotency_key(booking_id=42, attempt=1)
        k3 = build_idempotency_key(booking_id=42, attempt=2)
        assert k1 == k2, "HS-3 FAIL: idempotency key must be deterministic"
        assert k1 != k3, "HS-3 FAIL: different attempt must produce different key"


# ─────────────────────────────────────────────────────────────────────────────
# HS-4: AI Cost Controls
# ─────────────────────────────────────────────────────────────────────────────

class TestHS4AICostControls:
    """
    Acceptance Gate — HS-4:
      ✓ AI_KILL_SWITCH=1 → call_agent_with_controls returns fallback without calling Claude
      ✓ Over-budget tenant → check_budget raises HTTP 429
      ✓ Circuit breaker opens after 50%+ failures; allows call after reset_timeout
      ✓ Usage is logged after every call (success and failure)
    """

    def test_kill_switch_blocks_all_ai_calls(self):
        """With AI_KILL_SWITCH=1, no Claude API calls should be made."""
        import sys
        from app.core.ai_budget import call_agent_with_controls

        # Inject a mock 'anthropic' module so the lazy `import anthropic` inside
        # call_agent_with_controls never causes ModuleNotFoundError in the test env.
        # The kill-switch guard fires BEFORE the import, so Anthropic() is never called.
        mock_anthropic_module = MagicMock()

        with patch.dict(os.environ, {"AI_KILL_SWITCH": "1"}):
            with patch.dict(sys.modules, {"anthropic": mock_anthropic_module}):
                mock_db = MagicMock()

                async def run():
                    return await call_agent_with_controls(
                        db=mock_db, tenant_id=1, agent_name="test",
                        system_prompt="sys", user_prompt="usr",
                    )

                # Use asyncio.run() — compatible with Python 3.10+
                result = asyncio.run(run())
                assert result["from_fallback"] is True,   "HS-4 FAIL: kill-switch must return fallback"
                assert result["reason"] == "kill_switch", "HS-4 FAIL: reason must be 'kill_switch'"
                # The Anthropic client must never have been instantiated
                mock_anthropic_module.Anthropic.assert_not_called()

    def test_over_budget_raises_429(self):
        """Tenant at or above token limit must get HTTP 429."""
        from app.core.ai_budget import check_budget
        from app.models.ai_usage import TenantAIBudget
        from fastapi import HTTPException

        _, Session = _make_test_engine_and_session()
        db = Session()

        # Seed a tenant whose usage equals the monthly limit
        budget = TenantAIBudget(tenant_id=99, monthly_token_limit=1000, tokens_used_month=1000)
        db.add(budget)
        db.commit()

        with pytest.raises(HTTPException) as exc_info:
            check_budget(db, tenant_id=99)
        assert exc_info.value.status_code == 429, "HS-4 FAIL: over-budget must return HTTP 429"
        db.close()

    def test_circuit_breaker_opens_after_failures(self):
        from app.core.ai_budget import CircuitBreaker

        cb = CircuitBreaker(name="test_agent", error_threshold_pct=50.0, window=10)

        # 5 failures out of 5 calls = 100% error rate ≥ 50% threshold → OPEN
        for _ in range(5):
            cb.record_failure()

        assert cb.state == "OPEN",            "HS-4 FAIL: circuit must be OPEN after 50%+ failures"
        assert cb.call_allowed() is False,    "HS-4 FAIL: OPEN circuit must block calls"

    def test_circuit_breaker_half_opens_after_timeout(self):
        """After reset_timeout_secs=0 elapses the circuit allows a probe call (HALF_OPEN)."""
        import time
        from app.core.ai_budget import CircuitBreaker

        # window=6, need ≥5 calls to evaluate error rate — use 5 failures (100% ≥ 50%)
        cb = CircuitBreaker(name="test_reset", error_threshold_pct=50.0, window=6, reset_timeout_secs=0)

        for _ in range(5):
            cb.record_failure()
        assert cb.state == "OPEN", "HS-4 FAIL: circuit should be OPEN after 5 failures"

        # reset_timeout_secs=0 means timeout has already elapsed → next call_allowed() → HALF_OPEN
        result = cb.call_allowed()
        assert result is True,              "HS-4 FAIL: circuit should allow probe call in HALF_OPEN"
        assert cb.state == "HALF_OPEN",     "HS-4 FAIL: state should be HALF_OPEN after timeout"

        # A successful probe closes the circuit
        cb.record_success()
        assert cb.state == "CLOSED",        "HS-4 FAIL: success in HALF_OPEN must close circuit"

    def test_usage_logging_writes_row(self):
        """record_usage() must write a row with correct token counts and calculated cost."""
        from app.core.ai_budget import record_usage
        from app.models.ai_usage import AIUsage

        _, Session = _make_test_engine_and_session()
        db = Session()

        record_usage(db, tenant_id=5, agent_name="triage", model="claude-sonnet-4-6",
                     tokens_in=100, tokens_out=50, success=True)

        rows = db.query(AIUsage).filter(AIUsage.tenant_id == 5).all()
        assert len(rows) == 1,          "HS-4 FAIL: usage row not written to ai_usage table"
        assert rows[0].tokens_in == 100
        assert rows[0].tokens_out == 50
        assert rows[0].success is True
        assert rows[0].cost_usd > 0,    "HS-4 FAIL: cost must be calculated from token counts"
        db.close()

    def test_cost_calculation(self):
        from app.core.ai_budget import calc_cost_usd

        # Claude Sonnet pricing: $3.00 per 1M input tokens
        cost = calc_cost_usd(tokens_in=1_000_000, tokens_out=0)
        assert abs(cost - 3.00) < 0.001, "HS-4 FAIL: input token cost incorrect"

        # $15.00 per 1M output tokens
        cost = calc_cost_usd(tokens_in=0, tokens_out=1_000_000)
        assert abs(cost - 15.00) < 0.001, "HS-4 FAIL: output token cost incorrect"
