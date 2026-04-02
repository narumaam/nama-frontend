from fastapi import APIRouter, HTTPException

from app.demo_data import get_demo_case, get_demo_crm_case, list_demo_cases
from app.schemas.itinerary import ItineraryResponse
from app.schemas.queries import ExtractedLeadData, QueryTriageResult

router = APIRouter()


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
