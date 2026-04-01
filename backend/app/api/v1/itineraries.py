from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.itinerary import ItineraryCreateRequest, ItineraryResponse
from app.agents.itinerary import ItineraryAgent
from app.api.v1.deps import get_current_user

router = APIRouter()
itinerary_agent = ItineraryAgent()

@router.post("/generate", response_model=ItineraryResponse)
async def generate_itinerary(
    request: ItineraryCreateRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate an AI-powered itinerary for a lead.
    This triggers the Itinerary Intelligence Agent (M8).
    """
    try:
        # 1. Generate the Itinerary using the Agentic logic
        response = await itinerary_agent.generate_itinerary(request)
        
        # 2. In a real scenario, we'd also save this to the DB here.
        # (Itinerary model logic will follow in the next step)
        
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
def health_check():
    return {"status": "ready", "module": "ITINERARIES"}
