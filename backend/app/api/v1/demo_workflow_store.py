from __future__ import annotations

from copy import deepcopy
from datetime import datetime
from typing import Dict

from app.demo_data import list_demo_cases


DemoWorkflowCase = Dict[str, str]

_WORKFLOW_STATE: Dict[str, Dict[str, dict]] = {}


def _now_label() -> str:
    return datetime.utcnow().strftime("%d %b %Y · %H:%M")


def _default_case(case: dict) -> dict:
    finance_status = case["finance"]["status"]
    slug = case["slug"]
    if slug == "maldives-honeymoon":
        lead_stage = "Qualified"
        next_action = "Draft itinerary and align the first quote"
        next_action_at = "Today · 16:00"
    elif slug == "dubai-bleisure":
        lead_stage = "Quoted"
        next_action = "Send the quote and wait for commercial confirmation"
        next_action_at = "Today · 17:30"
    else:
        lead_stage = "Follow Up"
        next_action = "Follow up on deposit timing and keep the hold warm"
        next_action_at = "Tomorrow · 10:00"

    return {
        "slug": slug,
        "leadStage": lead_stage,
        "nextAction": next_action,
        "nextActionAt": next_action_at,
        "financeStatus": finance_status,
        "paymentState": _default_payment_state(slug),
        "bookingState": "Ready for handoff"
        if "received" in finance_status.lower() or "approved" in finance_status.lower()
        else "Pending finance",
        "guestPackState": "Queued",
        "invoiceState": "Draft",
        "invoiceDownloadState": "Ready",
        "travelerPdfState": "Draft",
        "travelerApprovalState": "Awaiting approval",
        "lastUpdated": "03 Apr 2026 · 12:00",
    }


def _default_payment_state(slug: str) -> str:
    if slug == "maldives-honeymoon":
        return "Awaiting hold confirmation"
    if slug == "dubai-bleisure":
        return "Quote approval stage"
    return "Deposit reminder stage"


def _seed_cases() -> Dict[str, dict]:
    return {case["slug"]: _default_case(case) for case in list_demo_cases()}


def list_tenant_workflow_cases(tenant_name: str) -> dict:
    if tenant_name not in _WORKFLOW_STATE:
        _WORKFLOW_STATE[tenant_name] = _seed_cases()
    return {"tenant_name": tenant_name, "cases": deepcopy(_WORKFLOW_STATE[tenant_name])}


def update_tenant_workflow_case(tenant_name: str, slug: str, patch: dict) -> dict:
    if tenant_name not in _WORKFLOW_STATE:
        _WORKFLOW_STATE[tenant_name] = _seed_cases()

    current_case = deepcopy(_WORKFLOW_STATE[tenant_name].get(slug) or _seed_cases().get(slug))
    if not current_case:
        raise KeyError(f"Unknown workflow case: {slug}")

    current_case.update(patch)
    current_case["slug"] = slug
    current_case["lastUpdated"] = _now_label()
    _WORKFLOW_STATE[tenant_name][slug] = current_case
    return {"tenant_name": tenant_name, "cases": deepcopy(_WORKFLOW_STATE[tenant_name])}
