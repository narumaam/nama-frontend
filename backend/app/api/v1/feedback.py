from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

from app.db.session import get_db
from app.api.v1.deps import get_current_user, require_tenant
from app.models.auth import User

router = APIRouter()

class FeedbackCreate(BaseModel):
    score: int # 0-10
    comment: Optional[str] = None
    feature: Optional[str] = None # which page/feature they are on

@router.post("/", status_code=status.HTTP_201_CREATED)
def submit_feedback(
    feedback_in: FeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submit NPS or general feedback.
    In Phase 4, we store this for internal product improvement.
    """
    if feedback_in.score < 0 or feedback_in.score > 10:
        raise HTTPException(status_code=400, detail="Score must be between 0 and 10")
    
    # Logic to store feedback in DB (omitting model for brevity, using print)
    print(f"[FEEDBACK] User {current_user.email} (Tenant {current_user.tenant_id}) gave score {feedback_in.score}: {feedback_in.comment}")
    
    return {"status": "success", "message": "Thank you for your feedback!"}
