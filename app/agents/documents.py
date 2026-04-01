import os
import json
from datetime import date
from typing import Dict, Any, Optional
from app.schemas.documents import DocumentType, PassportData, DocumentUploadResponse, DocumentStatus

class DocumentAgent:
    """
    NAMA Document Intelligence Agent.
    Handles AI-powered OCR for Passports, Visas, and automated compliance checks.
    """
    
    def __init__(self, model: str = "claude-3-5-sonnet-20240620"):
        self.model = model
        self.api_key = os.getenv("ANTHROPIC_API_KEY")

    async def extract_passport_data(self, image_url: str) -> PassportData:
        """
        Uses Claude 3.5 Vision to perform high-accuracy OCR on a passport image.
        """
        # Step 1: In a production environment, this would call Claude's vision capabilities
        # (Using the base64 or URL of the passport image)
        
        # Prototype: Mocking the vision-based extraction for demonstration
        print(f"[DOCUMENT_AGENT] Extracting data from image: {image_url}")
        
        return PassportData(
            first_name="Radhika",
            last_name="Iyer",
            passport_number="L12345678",
            nationality="Indian",
            dob="1992-05-15",
            expiry_date="2032-05-15", # Valid
            gender="Female",
            issuing_country="India"
        )

    async def validate_document(self, doc_type: DocumentType, data: Dict[str, Any]) -> DocumentUploadResponse:
        """
        Performs automated validation (e.g., expiry check, passport validity rules).
        """
        errors = []
        today = date.today()
        
        if doc_type == DocumentType.PASSPORT:
            expiry_date = date.fromisoformat(data["expiry_date"])
            if expiry_date < today:
                errors.append("Passport has expired.")
            elif (expiry_date - today).days < 180:
                errors.append("Passport has less than 6 months of validity left.")
        
        status = DocumentStatus.VERIFIED if not errors else DocumentStatus.REJECTED
        
        return DocumentUploadResponse(
            id=101, # Mock ID
            type=doc_type,
            status=status,
            extracted_data=data,
            verification_errors=errors,
            expiry_warning=(doc_type == DocumentType.PASSPORT and (expiry_date - today).days < 180)
        )

    async def get_visa_checklist(self, nationality: str, destination: str) -> Dict[str, Any]:
        """
        Generates a custom visa requirement checklist.
        """
        # Logic to fetch or generate checklist based on destination and nationality
        mock_checklists = {
            "UAE": ["E-Visa required (2-5 working days)", "Passport must be valid for at least 6 months", "Valid return ticket and travel insurance"],
            "Thailand": ["Visa-Free for 30 days (Indian Nationals)", "Passport with at least 2 blank pages", "Proof of funds (10,000 THB per person)"]
        }
        
        checklist = mock_checklists.get(destination.upper(), ["Check with local consulate", "Valid passport", "Travel insurance"])
        return {"destination": destination, "checklist": checklist}
