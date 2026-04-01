from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.documents import DocumentType, DocumentUploadResponse, PassportData
from app.agents.documents import DocumentAgent
from app.api.v1.deps import get_current_user
from typing import Dict, Any

router = APIRouter()
doc_agent = DocumentAgent()

@router.post("/upload/passport", response_model=DocumentUploadResponse)
async def upload_passport(
    # image: UploadFile = File(...), # In a real app, handle image uploads
    image_url: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload a passport image and extract data via AI OCR (M4).
    """
    try:
        # Step 1: AI-powered Vision OCR
        passport_data = await doc_agent.extract_passport_data(image_url)
        
        # Step 2: Automated Validation (Expiry, Formatting)
        result = await doc_agent.validate_document(DocumentType.PASSPORT, passport_data.model_dump())
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/visa-checklist", response_model=Dict[str, Any])
async def get_visa_requirements(
    nationality: str,
    destination: str,
    current_user = Depends(get_current_user)
):
    """
    Get the mandatory visa checklist for a traveler (M4).
    """
    try:
        # Generate custom checklist based on AI logic
        checklist = await doc_agent.get_visa_checklist(nationality, destination)
        return checklist
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
def health_check():
    return {"status": "ready", "module": "DOCUMENTS"}
