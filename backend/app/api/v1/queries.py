from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.queries import RawQuery, QueryTriageResult
from app.agents.triage import QueryTriageAgent
from app.api.v1.deps import get_current_user

router = APIRouter()
triage_agent = QueryTriageAgent()

@router.post("/ingest", response_model=QueryTriageResult)
async def ingest_query(
    query: RawQuery,
    # current_user = Depends(get_current_user), # In real app, we use API keys for webhooks
    db: Session = Depends(get_db)
):
    """
    Ingest a raw query (M1) from WhatsApp/Email and triage it into structured lead data (M2).
    """
    try:
        # 1. Triage the query using AI
        result = await triage_agent.triage_query(query)
        
        # 2. If it's a valid query, in a real scenario, we'd also:
        # - Create a new Lead record (M2) in the DB
        # - Link the query and the lead
        # - Notify the assigned agent
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/whatsapp-webhook")
async def whatsapp_webhook(
    payload: dict,
    db: Session = Depends(get_db)
):
    """
    Mock webhook for WhatsApp (e.g. from Twilio or Meta).
    """
    # 1. Extract content from payload (Twilio-specific example)
    raw_content = payload.get("Body", "")
    sender = payload.get("From", "")
    
    # 2. Create RawQuery for triage
    # (Using hardcoded tenant_id for prototype)
    query = RawQuery(
        source="WHATSAPP",
        content=raw_content,
        sender_id=sender,
        tenant_id=1
    )
    
    # 3. Triage
    result = await triage_agent.triage_query(query)
    
    return {"status": "ok", "triage_result": result}


@router.get("/health")
def health_check():
    return {"status": "ready", "module": "QUERIES"}
