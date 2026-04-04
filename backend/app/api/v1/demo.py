from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.v1.deps import get_current_user
from app.api.v1.demo_workflow_store import list_tenant_workflow_cases, update_tenant_workflow_case
from app.models.auth import UserRole

from app.demo_data import get_demo_case, get_demo_crm_case, list_demo_cases
from app.schemas.itinerary import ItineraryResponse
from app.schemas.queries import ExtractedLeadData, QueryTriageResult

router = APIRouter()


class DemoWorkflowUpdateRequest(BaseModel):
    tenant_name: str
    slug: str
    action: str
    patch: dict


ACTION_ALLOWED_ROLES = {
    "lead.set-stage": {UserRole.R1_SUPER_ADMIN, UserRole.R2_ORG_ADMIN, UserRole.R3_SALES_MANAGER},
    "finance.send-quote": {UserRole.R2_ORG_ADMIN, UserRole.R3_SALES_MANAGER, UserRole.R5_FINANCE_ADMIN},
    "finance.record-deposit": {UserRole.R2_ORG_ADMIN, UserRole.R5_FINANCE_ADMIN},
    "booking.release-guest-pack": {UserRole.R2_ORG_ADMIN, UserRole.R4_OPS_EXECUTIVE},
    "artifact.download-invoice": {
        UserRole.R1_SUPER_ADMIN,
        UserRole.R2_ORG_ADMIN,
        UserRole.R3_SALES_MANAGER,
        UserRole.R4_OPS_EXECUTIVE,
        UserRole.R5_FINANCE_ADMIN,
        UserRole.R6_SUB_AGENT,
    },
    "artifact.mark-invoice-sent": {UserRole.R2_ORG_ADMIN, UserRole.R5_FINANCE_ADMIN},
    "artifact.mark-invoice-paid": {UserRole.R2_ORG_ADMIN, UserRole.R5_FINANCE_ADMIN},
    "artifact.download-traveler-pdf": {
        UserRole.R1_SUPER_ADMIN,
        UserRole.R2_ORG_ADMIN,
        UserRole.R3_SALES_MANAGER,
        UserRole.R4_OPS_EXECUTIVE,
        UserRole.R5_FINANCE_ADMIN,
        UserRole.R6_SUB_AGENT,
    },
    "artifact.approve-traveler-pdf": {UserRole.R2_ORG_ADMIN, UserRole.R4_OPS_EXECUTIVE},
    "artifact.share-traveler-pdf": {UserRole.R2_ORG_ADMIN, UserRole.R4_OPS_EXECUTIVE},
}


@router.get("/cases")
def get_cases():
    return [
        {
            "slug": case["slug"],
            "lead_id": case["lead_id"],
            "guest_name": case["guest_name"],
            "priority": case["priority"],
            "query": case["query"],
            "destination": case["triage"]["destination"],
            "quote_total": case["finance"]["quote_total"],
            "status": case["finance"]["status"],
            "capture_source": case["capture"]["primary_source"],
            "inbound_channel": case["capture"]["inbound_channel"],
            "transcript_snippet": case["sales_transcript"][0]["message"],
        }
        for case in list_demo_cases()
    ]


@router.get("/workflow")
def get_case_workflow(tenant_name: str, current_user=Depends(get_current_user)):
    return {
        "tenant_name": tenant_name,
        "source": "backend-demo",
        "cases": list_tenant_workflow_cases(tenant_name)["cases"],
    }


@router.post("/workflow")
def update_case_workflow(payload: DemoWorkflowUpdateRequest, current_user=Depends(get_current_user)):
    allowed_roles = ACTION_ALLOWED_ROLES.get(payload.action)
    if not allowed_roles:
        raise HTTPException(status_code=400, detail="Unknown workflow action")

    if current_user.role not in allowed_roles:
        raise HTTPException(status_code=403, detail="The user doesn't have enough privileges")

    try:
        updated = update_tenant_workflow_case(payload.tenant_name, payload.slug, payload.patch)
    except KeyError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error

    return {
        "tenant_name": updated["tenant_name"],
        "source": "backend-demo",
        "cases": updated["cases"],
    }


@router.get("/case/{slug}")
def get_case(slug: str):
    case = get_demo_case(slug=slug)
    if not case:
        raise HTTPException(status_code=404, detail="Demo case not found")
    return case


@router.get("/lead/{lead_id}")
def get_case_by_lead(lead_id: int):
    case = get_demo_case(lead_id=lead_id)
    if not case:
        raise HTTPException(status_code=404, detail="Demo lead not found")
    return case


@router.get("/crm/{slug}")
def get_demo_crm(slug: str):
    case = get_demo_crm_case(slug=slug)
    if not case:
        raise HTTPException(status_code=404, detail="Demo CRM case not found")
    return case


@router.get("/triage/{slug}", response_model=QueryTriageResult)
def get_demo_triage(slug: str):
    case = get_demo_case(slug=slug)
    if not case:
        raise HTTPException(status_code=404, detail="Demo case not found")
    triage = case["triage"]
    return QueryTriageResult(
        is_valid_query=True,
        extracted_data=ExtractedLeadData(
            destination=triage["destination"],
            duration_days=triage["duration_days"],
            travelers_count=triage["travelers_count"],
            travel_dates=triage["travel_dates"],
            budget_per_person=triage["budget_per_person"],
            currency=triage["currency"],
            preferences=triage["preferences"],
            style=triage["style"],
            confidence_score=triage["confidence_score"],
        ),
        suggested_reply=triage["suggested_reply"],
        reasoning=triage["reasoning"],
    )


@router.get("/itinerary/{slug}", response_model=ItineraryResponse)
def get_demo_itinerary(slug: str):
    case = get_demo_case(slug=slug)
    if not case:
        raise HTTPException(status_code=404, detail="Demo case not found")
    return ItineraryResponse(**case["itinerary"])
