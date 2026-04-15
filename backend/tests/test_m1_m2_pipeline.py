"""
M1 → M2 Pipeline Tests
========================
Covers:
  ✓ Lead model creation / field persistence
  ✓ create_lead_from_triage() wires triage output into Lead columns
  ✓ Priority derivation logic
  ✓ get_leads() is tenant-scoped (HS-2)
  ✓ get_lead() raises 404 for cross-tenant access (HS-2)
  ✓ update_lead() enforces state machine transitions
  ✓ update_lead() blocks invalid transitions
  ✓ queries.py endpoint now passes tenant_id to triage agent (source inspection)

Run with:  pytest tests/test_m1_m2_pipeline.py -v
"""

import os
import pytest

os.environ.setdefault("DATABASE_URL", "sqlite:///./test_pipeline.db")
os.environ.setdefault("SECRET_KEY", "test-secret-key-32-chars-minimum!!")
os.environ.setdefault("REFRESH_SECRET_KEY", "test-refresh-key-32-chars-minimum!")


# ─── Shared DB fixture ────────────────────────────────────────────────────────

def _make_db():
    """In-memory SQLite session with all real models + stubs for orphan FKs."""
    from sqlalchemy import Table, Column, Integer as SAInt, create_engine
    from sqlalchemy.orm import sessionmaker
    from app.db.session import Base

    # Pre-import models in dependency order so FKs resolve
    import app.models.auth        # tenants, users
    import app.models.leads       # leads (depends on tenants, users)
    import app.models.itineraries # itineraries (depends on tenants, leads, users)
    import app.models.vendors     # vendors (depends on tenants)
    import app.models.bookings    # bookings (depends on tenants, leads, itineraries, vendors)
    import app.models.payments    # payments (depends on tenants, bookings)
    import app.models.ai_usage    # ai_usage (depends on tenants)

    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    return Session()


# ─── M2: Lead model ───────────────────────────────────────────────────────────

class TestLeadModel:

    def test_lead_created_with_required_fields(self):
        """Lead persists with tenant_id, sender_id, source, status=NEW."""
        from app.models.leads import Lead, LeadStatus, LeadSource

        db = _make_db()
        lead = Lead(tenant_id=1, sender_id="+919876543210", source=LeadSource.WHATSAPP)
        db.add(lead)
        db.commit()
        db.refresh(lead)

        assert lead.id is not None
        assert lead.status == LeadStatus.NEW
        assert lead.tenant_id == 1
        assert lead.source == LeadSource.WHATSAPP
        db.close()

    def test_lead_triage_fields_stored(self):
        """Triage-extracted fields are persisted correctly."""
        from app.models.leads import Lead, LeadSource

        db = _make_db()
        lead = Lead(
            tenant_id=1,
            sender_id="test@example.com",
            source=LeadSource.EMAIL,
            destination="Bali",
            duration_days=7,
            travelers_count=2,
            budget_per_person=50000.0,
            currency="INR",
            travel_style="Luxury",
            preferences=["beach", "spa"],
            triage_confidence=0.92,
        )
        db.add(lead)
        db.commit()
        db.refresh(lead)

        assert lead.destination == "Bali"
        assert lead.duration_days == 7
        assert lead.triage_confidence == 0.92
        assert "beach" in lead.preferences
        db.close()


# ─── M1 → M2: create_lead_from_triage ────────────────────────────────────────

class TestCreateLeadFromTriage:

    def _make_triage_result(self, valid=True, confidence=0.9, style="Luxury"):
        from app.schemas.queries import QueryTriageResult, ExtractedLeadData
        if not valid:
            return QueryTriageResult(is_valid_query=False, reasoning="not a travel query")

        ed = ExtractedLeadData(
            destination="Maldives",
            duration_days=5,
            travelers_count=2,
            travel_dates="December 2026",
            budget_per_person=150000.0,
            currency="INR",
            preferences=["overwater villa", "snorkelling"],
            style=style,
            confidence_score=confidence,
        )
        return QueryTriageResult(
            is_valid_query=True,
            extracted_data=ed,
            suggested_reply="Great! Let me put together a Maldives package for you.",
            reasoning="Clear travel intent with destination and dates.",
        )

    def _make_query(self):
        from app.schemas.queries import RawQuery
        return RawQuery(
            source="WHATSAPP",
            content="Hi, looking for Maldives trip for 2 in December budget 3L per person",
            sender_id="+919876543210",
            tenant_id=1,
        )

    def test_creates_lead_from_valid_triage(self):
        """create_lead_from_triage() persists a Lead row from valid AI output."""
        from app.core.leads import create_lead_from_triage

        db = _make_db()
        lead = create_lead_from_triage(
            db=db,
            tenant_id=1,
            query=self._make_query(),
            triage_result=self._make_triage_result(),
        )

        assert lead.id is not None,                   "M2: lead not persisted"
        assert lead.destination == "Maldives",        "M2: destination not stored"
        assert lead.travelers_count == 2,             "M2: traveler count not stored"
        assert lead.travel_style == "Luxury",         "M2: travel style not stored"
        assert lead.triage_confidence == 0.9,         "M2: confidence not stored"
        assert lead.suggested_reply is not None,      "M2: suggested_reply not stored"
        assert lead.triage_result is not None,        "M2: triage_result JSON not stored"
        assert lead.raw_message is not None,          "M2: raw_message not stored"
        db.close()

    def test_high_confidence_luxury_gets_priority_3(self):
        """Luxury + high confidence → priority ≤ 4 (high importance)."""
        from app.core.leads import create_lead_from_triage

        db = _make_db()
        lead = create_lead_from_triage(
            db=db, tenant_id=1,
            query=self._make_query(),
            triage_result=self._make_triage_result(confidence=0.9, style="Luxury"),
        )
        assert lead.priority <= 4, f"M2: Luxury+high-confidence priority should be high, got {lead.priority}"
        db.close()

    def test_low_confidence_budget_gets_priority_8(self):
        """Budget style + low confidence → priority ≥ 7 (lower importance)."""
        from app.core.leads import create_lead_from_triage

        db = _make_db()
        lead = create_lead_from_triage(
            db=db, tenant_id=1,
            query=self._make_query(),
            triage_result=self._make_triage_result(confidence=0.3, style="Budget"),
        )
        assert lead.priority >= 7, f"M2: Budget+low-confidence priority should be low, got {lead.priority}"
        db.close()


# ─── M2: RLS on reads ─────────────────────────────────────────────────────────

class TestLeadRLS:

    def _seed_lead(self, db, tenant_id: int):
        from app.models.leads import Lead, LeadSource
        lead = Lead(tenant_id=tenant_id, sender_id="test", source=LeadSource.DIRECT)
        db.add(lead)
        db.commit()
        db.refresh(lead)
        return lead

    def test_get_leads_returns_only_own_tenant(self):
        """get_leads() for tenant 1 must not return tenant 2's leads."""
        from app.core.leads import get_leads

        db = _make_db()
        self._seed_lead(db, tenant_id=1)
        self._seed_lead(db, tenant_id=2)

        items, total = get_leads(db, tenant_id=1)
        assert total == 1,                   "HS-2 M2: tenant isolation failed — wrong count"
        assert items[0].tenant_id == 1,     "HS-2 M2: returned other tenant's lead"
        db.close()

    def test_get_lead_cross_tenant_returns_404(self):
        """get_lead() with wrong tenant must raise 404 (not 403)."""
        from fastapi import HTTPException
        from app.core.leads import get_lead

        db = _make_db()
        lead = self._seed_lead(db, tenant_id=1)

        with pytest.raises(HTTPException) as exc_info:
            get_lead(db, lead_id=lead.id, tenant_id=2)
        assert exc_info.value.status_code == 404, "HS-2 M2: cross-tenant access must return 404"
        db.close()


# ─── M2: State machine ────────────────────────────────────────────────────────

class TestLeadStateMachine:

    def _create_lead(self, db):
        from app.models.leads import Lead, LeadSource
        lead = Lead(tenant_id=1, sender_id="x", source=LeadSource.DIRECT)
        db.add(lead)
        db.commit()
        db.refresh(lead)
        return lead

    def test_valid_transition_new_to_contacted(self):
        from app.core.leads import update_lead
        from app.schemas.leads import LeadUpdate

        db = _make_db()
        lead = self._create_lead(db)
        updated = update_lead(db, lead_id=lead.id, tenant_id=1,
                              payload=LeadUpdate(status="CONTACTED"))
        assert updated.status.value == "CONTACTED"
        assert updated.contacted_at is not None, "M2: contacted_at timestamp not set"
        db.close()

    def test_valid_transition_contacted_to_qualified(self):
        from app.core.leads import update_lead
        from app.schemas.leads import LeadUpdate

        db = _make_db()
        lead = self._create_lead(db)
        update_lead(db, lead_id=lead.id, tenant_id=1, payload=LeadUpdate(status="CONTACTED"))
        updated = update_lead(db, lead_id=lead.id, tenant_id=1, payload=LeadUpdate(status="QUALIFIED"))
        assert updated.status.value == "QUALIFIED"
        db.close()

    def test_invalid_transition_new_to_won_rejected(self):
        """Cannot jump from NEW directly to WON."""
        from fastapi import HTTPException
        from app.core.leads import update_lead
        from app.schemas.leads import LeadUpdate

        db = _make_db()
        lead = self._create_lead(db)

        with pytest.raises(HTTPException) as exc_info:
            update_lead(db, lead_id=lead.id, tenant_id=1, payload=LeadUpdate(status="WON"))
        assert exc_info.value.status_code == 422, "M2: invalid state transition must return 422"
        db.close()

    def test_won_is_terminal(self):
        """Cannot transition out of WON state."""
        from fastapi import HTTPException
        from app.core.leads import update_lead
        from app.schemas.leads import LeadUpdate

        db = _make_db()
        lead = self._create_lead(db)
        # Walk through the state machine to WON
        for s in ("CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "WON"):
            update_lead(db, lead_id=lead.id, tenant_id=1, payload=LeadUpdate(status=s))

        with pytest.raises(HTTPException) as exc_info:
            update_lead(db, lead_id=lead.id, tenant_id=1, payload=LeadUpdate(status="LOST"))
        assert exc_info.value.status_code == 422, "M2: WON is terminal — no further transitions"
        db.close()


# ─── queries.py wiring check ──────────────────────────────────────────────────

class TestQueriesEndpointWiring:

    def test_ingest_uses_require_tenant_not_body(self):
        """
        POST /queries/ingest must use require_tenant (JWT) not query.tenant_id.
        Verify by inspecting the endpoint source.
        """
        import inspect
        from app.api.v1 import queries as queries_module
        source = inspect.getsource(queries_module.ingest_query)
        assert "require_tenant" in source,    "M1: ingest_query must depend on require_tenant"
        assert "tenant_id=tenant_id" in source, "M1: triage call must forward JWT tenant_id"

    def test_triage_agent_signature_accepts_tenant_id_and_db(self):
        """triage_query() must accept tenant_id and db as explicit arguments."""
        import inspect
        from app.agents.triage import QueryTriageAgent
        sig = inspect.signature(QueryTriageAgent.triage_query)
        params = list(sig.parameters.keys())
        assert "tenant_id" in params, "HS-4: triage_query must accept tenant_id (budget enforcement)"
        assert "db" in params,        "HS-4: triage_query must accept db (usage logging)"
