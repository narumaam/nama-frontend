"""
Onboarding API — Seeded Workspace + Apply Config
---------------------------------------------------
POST /api/v1/onboarding/seed-workspace
  Creates a realistic set of sample records for a new tenant so their first
  dashboard visit looks like a live product, not a blank screen.
  Idempotent: if leads already exist for the tenant the endpoint returns
  { already_seeded: true } and makes no writes.

POST /api/v1/onboarding/apply-config
  Persists an AI-generated AgencyConfig for the authenticated tenant.
  Writes to tenant.settings JSONB + creates Role/Destination records in DB.

POST /api/v1/onboarding/trigger-drip
  Sends a Resend email for the given drip day (0, 1, 3, or 7).
"""

import logging
import os
import httpx
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.v1.deps import require_tenant
from app.models.leads import Lead, LeadStatus, LeadSource
from app.models.itineraries import Itinerary, ItineraryStatus
from app.api.v1.quotations import Quotation, QuotationStatus
from app.models.rbac import Role, RolePermission
from app.models.content import Destination
from app.models.auth import Tenant

logger = logging.getLogger(__name__)
router = APIRouter()


# ─── Agency Config models ──────────────────────────────────────────────────────

class AgencyInfo(BaseModel):
    name: str
    type: str
    primary_destinations: List[str] = []
    focus_segments: List[str] = []
    team_size_estimate: int = 1


class RoleConfig(BaseModel):
    name: str
    type: str
    permissions: List[str] = []
    count: int = 1


class TeamMember(BaseModel):
    name: str
    role: str
    is_placeholder: bool = True


class AgencyConfig(BaseModel):
    agency: AgencyInfo
    roles: List[RoleConfig] = []
    team: List[TeamMember] = []
    dashboard_widgets: List[str] = []
    initial_destinations: List[str] = []


class ApplyConfigRequest(BaseModel):
    config: AgencyConfig


class ApplyConfigResponse(BaseModel):
    success: bool
    applied: List[str]
    message: Optional[str] = None


# ─── Drip Email models + helper ───────────────────────────────────────────────

class TriggerDripRequest(BaseModel):
    email: str
    name: str
    agency_name: str = "Your Agency"
    day: int  # 0, 1, 3, or 7


def _send_drip_email(email: str, name: str, agency_name: str, day: int) -> None:
    """
    Delegates email sending to the Next.js /api/email/drip route
    which uses React Email + Resend JS SDK for beautiful cross-client templates.
    Falls back gracefully if the route is unavailable.
    Never raises — all errors are logged and swallowed.
    """
    try:
        frontend_url = os.getenv("FRONTEND_URL", "https://getnama.app")
        endpoint = f"{frontend_url}/api/email/drip"
        resp = httpx.post(
            endpoint,
            json={"email": email, "name": name, "agency_name": agency_name, "day": day},
            timeout=10.0,
        )
        logger.info("_send_drip_email: day=%d email=%s status=%d", day, email, resp.status_code)
    except Exception as exc:
        logger.warning("_send_drip_email: failed (non-fatal): %s", exc)


# In-process store (keyed by tenant_id). Also written to tenant.settings JSONB.
_onboarding_configs: Dict[int, Dict[str, Any]] = {}


@router.post("/apply-config", response_model=ApplyConfigResponse)
def apply_config(
    body: ApplyConfigRequest,
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
) -> ApplyConfigResponse:
    """
    Persist the AI-generated AgencyConfig for this tenant.
    Writes to tenant.settings JSONB + creates Role and Destination records.
    """
    config_dict = body.config.model_dump()
    _onboarding_configs[tenant_id] = config_dict  # keep in-memory cache

    logger.info(
        "apply_config: tenant %s — agency=%s roles=%d team=%d",
        tenant_id,
        config_dict["agency"]["name"],
        len(config_dict["roles"]),
        len(config_dict["team"]),
    )

    applied: List[str] = []

    # 1. Persist to tenant.settings JSONB
    try:
        tenant_row = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if tenant_row:
            settings = dict(tenant_row.settings or {})
            settings["onboarding_config"] = config_dict
            tenant_row.settings = settings
            applied.append("config_persisted")
    except Exception as e:
        logger.warning("apply_config: failed to persist to tenant settings: %s", e)

    # 2. Create Roles + Permissions
    roles_created = 0
    for role_config in body.config.roles:
        try:
            existing_role = db.query(Role).filter(
                Role.tenant_id == tenant_id,
                Role.name == role_config.name
            ).first()
            if existing_role:
                continue
            new_role = Role(
                tenant_id=tenant_id,
                name=role_config.name,
                description=f"{role_config.type} role ({role_config.count} member(s))",
                is_locked=False,
            )
            db.add(new_role)
            db.flush()
            for perm_str in role_config.permissions:
                parts = perm_str.split(":")
                if len(parts) == 2:
                    db.add(RolePermission(
                        role_id=new_role.id,
                        module=parts[0],
                        action=parts[1],
                        state="on",
                    ))
            roles_created += 1
        except Exception as e:
            logger.warning("apply_config: role creation failed for %s: %s", role_config.name, e)
    if roles_created:
        applied.append(f"{roles_created}_roles_created")

    # 3. Seed Destinations
    COUNTRY_MAP = {
        "maldives": "Maldives", "bali": "Indonesia", "paris": "France",
        "dubai": "UAE", "singapore": "Singapore", "thailand": "Thailand",
        "sri lanka": "Sri Lanka", "bhutan": "Bhutan", "nepal": "Nepal",
        "kashmir": "India", "rajasthan": "India", "kerala": "India",
        "europe": "Europe", "switzerland": "Switzerland", "japan": "Japan",
    }
    destinations_created = 0
    for dest_name in body.config.initial_destinations:
        try:
            existing = db.query(Destination).filter(
                Destination.tenant_id == tenant_id,
                Destination.name == dest_name
            ).first()
            if existing:
                continue
            country = COUNTRY_MAP.get(dest_name.lower(), "International")
            db.add(Destination(
                tenant_id=tenant_id,
                name=dest_name,
                country=country,
                is_shared=False,
                meta_tags=[],
            ))
            destinations_created += 1
        except Exception as e:
            logger.warning("apply_config: destination creation failed for %s: %s", dest_name, e)
    if destinations_created:
        applied.append(f"{destinations_created}_destinations_seeded")

    try:
        db.commit()
    except Exception as e:
        logger.error("apply_config: db.commit failed: %s", e)
        db.rollback()

    return ApplyConfigResponse(
        success=True,
        applied=applied,
        message=f"Configuration applied for {config_dict['agency']['name']}",
    )


@router.post("/trigger-drip")
def trigger_drip(
    body: TriggerDripRequest,
    _: int = Depends(require_tenant),
) -> dict:
    """
    Send a drip email for the given day (0, 1, 3, or 7).
    Fire-and-forget — always returns success; errors are logged internally.
    """
    _send_drip_email(body.email, body.name, body.agency_name, body.day)
    return {"sent": True, "day": body.day}


# ── Response schema ────────────────────────────────────────────────────────────

class SeedWorkspaceResponse(BaseModel):
    already_seeded: bool = False
    seeded: bool = False
    leads_created: int = 0
    itineraries_created: int = 0
    quotations_created: int = 0


# ── Endpoint ───────────────────────────────────────────────────────────────────

@router.post("/seed-workspace", response_model=SeedWorkspaceResponse)
def seed_workspace(
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
) -> SeedWorkspaceResponse:
    """
    Idempotent workspace seeder.

    Creates 2 leads, 1 itinerary, and 1 quotation for the tenant.
    Safe to call multiple times — if any leads already exist for this
    tenant the endpoint is a no-op and returns { already_seeded: true }.
    """
    # ── Idempotency check ──────────────────────────────────────────────────────
    existing = db.query(Lead).filter(Lead.tenant_id == tenant_id).first()
    if existing:
        logger.info("seed_workspace: tenant %s already seeded — skipping", tenant_id)
        return SeedWorkspaceResponse(already_seeded=True)

    # ── Lead 1 — HOT Maldives honeymoon ───────────────────────────────────────
    lead_1 = Lead(
        tenant_id=tenant_id,
        sender_id="+919876543210",
        source=LeadSource.WHATSAPP,
        full_name="Aarav & Priya Sharma",
        email="aarav.sharma@example.com",
        phone="+91 98765 43210",
        destination="Maldives Honeymoon",
        duration_days=7,
        travelers_count=2,
        travel_dates="Dec 15–22, 2026",
        budget_per_person=175000,
        currency="INR",
        travel_style="Luxury",
        status=LeadStatus.QUALIFIED,
        priority=1,
        notes=(
            "Looking for overwater bungalow, private butler. "
            "Anniversary trip. Very responsive on WhatsApp."
        ),
        triage_confidence=0.92,
    )
    db.add(lead_1)
    db.flush()   # get lead_1.id before referencing it

    # ── Lead 2 — WARM Bali family holiday ─────────────────────────────────────
    lead_2 = Lead(
        tenant_id=tenant_id,
        sender_id="+918765432109",
        source=LeadSource.EMAIL,
        full_name="Mehta Family",
        email="rahul.mehta@example.com",
        phone="+91 87654 32109",
        destination="Bali Family Holiday",
        duration_days=7,
        travelers_count=4,
        travel_dates="Apr 5–12, 2027",
        budget_per_person=70000,
        currency="INR",
        travel_style="Standard",
        status=LeadStatus.CONTACTED,
        priority=3,
        notes="Family of 4 with kids aged 8 and 11. Want kid-friendly resort.",
        triage_confidence=0.78,
    )
    db.add(lead_2)

    # ── Itinerary — 7N Maldives Luxury Package ────────────────────────────────
    days_json = [
        {
            "day": 1,
            "title": "Arrival & Check-in",
            "description": (
                "Seaplane transfer from Malé to the resort. "
                "Welcome drink and butler briefing. "
                "Evening sunset viewing from your overwater deck."
            ),
        },
        {
            "day": 2,
            "title": "House Reef Snorkeling",
            "description": (
                "Guided snorkeling session on the pristine house reef. "
                "Spot manta rays, turtles, and vibrant coral gardens. "
                "Afternoon at leisure on the sandbank."
            ),
        },
        {
            "day": 3,
            "title": "Sunset Dolphin Cruise",
            "description": (
                "Morning spa treatment. "
                "Afternoon dolphin-watching cruise with Champagne sunset. "
                "Private beach dinner arranged by butler."
            ),
        },
        {
            "day": 4,
            "title": "Spa & Wellness Day",
            "description": (
                "Full-day Overwater Spa package — couples massage, "
                "scrub, and facial. Afternoon yoga on the jetty."
            ),
        },
        {
            "day": 5,
            "title": "Water Sports & Excursions",
            "description": (
                "Jet ski, windsurfing, and paddleboarding. "
                "Optional scuba dive for certified divers. "
                "Evening bioluminescence tour."
            ),
        },
        {
            "day": 6,
            "title": "Farewell Dinner",
            "description": (
                "Private overwater dinner under the stars — "
                "5-course tasting menu with wine pairing. "
                "Exchange of anniversary gifts arranged by the team."
            ),
        },
        {
            "day": 7,
            "title": "Departure",
            "description": (
                "Leisurely breakfast. Late check-out. "
                "Seaplane transfer back to Malé for onward flight."
            ),
        },
    ]

    itinerary = Itinerary(
        tenant_id=tenant_id,
        lead_id=lead_1.id,
        title="7N Maldives Luxury Package — Aarav & Priya",
        destination="Maldives",
        duration_days=7,
        traveler_count=2,
        travel_style="Luxury",
        days_json=days_json,
        total_price=350000.0,
        currency="INR",
        margin_pct=12.9,
        status=ItineraryStatus.DRAFT,
        version=1,
    )
    db.add(itinerary)
    db.flush()   # get itinerary.id

    # ── Quotation — Maldives DRAFT quote ──────────────────────────────────────
    quotation = Quotation(
        tenant_id=tenant_id,
        lead_id=lead_1.id,
        itinerary_id=itinerary.id,
        lead_name="Aarav & Priya Sharma",
        destination="Maldives Honeymoon — 7 Nights",
        base_price=310000.0,
        margin_pct=12.9,
        total_price=350000.0,
        currency="INR",
        status=QuotationStatus.DRAFT,
        notes=(
            "Items: Overwater bungalow (5 nights) ₹2,10,000 | "
            "Seaplane transfers ₹45,000 | "
            "Half-board meals ₹35,000 | "
            "Sunset cruise add-on ₹20,000. "
            "Subtotal ₹3,10,000 + markup ₹40,000 = Total ₹3,50,000."
        ),
    )
    db.add(quotation)

    db.commit()

    logger.info(
        "seed_workspace: tenant %s seeded — 2 leads, 1 itinerary, 1 quotation",
        tenant_id,
    )
    return SeedWorkspaceResponse(
        seeded=True,
        leads_created=2,
        itineraries_created=1,
        quotations_created=1,
    )
