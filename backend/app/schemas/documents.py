from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import date

class DocumentType(str, Enum):
    PASSPORT = "PASSPORT"
    VISA = "VISA"
    INSURANCE = "INSURANCE"
    VOUCHER = "VOUCHER"
    ID_CARD = "ID_CARD"

class PassportData(BaseModel):
    first_name: str
    last_name: str
    passport_number: str
    nationality: str
    dob: str # YYYY-MM-DD
    expiry_date: str # YYYY-MM-DD
    gender: Optional[str] = None
    issuing_country: str

class DocumentStatus(str, Enum):
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"

class DocumentUploadResponse(BaseModel):
    id: int
    type: DocumentType
    status: DocumentStatus
    extracted_data: Optional[Dict[str, Any]] = None
    verification_errors: List[str] = []
    expiry_warning: bool = False
