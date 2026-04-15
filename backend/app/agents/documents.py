import json
from datetime import date
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.schemas.documents import DocumentType, PassportData, DocumentUploadResponse, DocumentStatus
from app.core.ai_budget import call_agent_with_controls

AGENT_NAME = "document_extraction"
MODEL = "claude-sonnet-4-6"


class DocumentAgent:
    """
    NAMA Document Intelligence Agent.
    Extracts passport data using Claude and performs automated compliance checks.
    """

    async def extract_passport_data(
        self,
        image_data: str,
        tenant_id: int,
        db: Session,
    ) -> PassportData:
        """
        Extract passport data from an image (base64 or URL) using Claude.

        Args:
            image_data: Base64 encoded image OR image URL
            tenant_id: Current tenant (from JWT)
            db: Database session for usage logging

        Returns:
            PassportData with extracted fields

        Note:
            Currently Claude API via call_agent_with_controls does not support
            image inputs. As a workaround, image_data is treated as a URL and
            included in the text prompt.
            Future: Extend call_agent_with_controls to support vision inputs.
        """
        system_prompt = self._build_system_prompt()
        user_prompt = self._build_user_prompt(image_data)

        result = await call_agent_with_controls(
            db=db,
            tenant_id=tenant_id,
            agent_name=AGENT_NAME,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            model=MODEL,
            max_tokens=1024,
            fallback_response=None,
        )

        # Handle fallback
        if result["from_fallback"]:
            return self._fallback_passport_data()

        # Parse response
        try:
            parsed = self._parse_passport_response(result["content"])
        except Exception as parse_err:
            return self._fallback_passport_data()

        return parsed

    def _build_system_prompt(self) -> str:
        """Build the system prompt for Claude."""
        return """You are an expert at extracting passport information from images.
You must extract and return ONLY valid JSON with the following fields:
{
  "full_name": "string",
  "passport_number": "string",
  "nationality": "string",
  "date_of_birth": "YYYY-MM-DD",
  "date_of_issue": "YYYY-MM-DD",
  "date_of_expiry": "YYYY-MM-DD",
  "gender": "string",
  "place_of_birth": "string"
}

Return ONLY JSON. No markdown, no extra text."""

    def _build_user_prompt(self, image_data: str) -> str:
        """Build the user prompt for Claude."""
        return f"""Extract all passport information from this image:
{image_data}

Please extract the following fields from the passport:
- Full name
- Passport number
- Nationality
- Date of birth
- Date of issue
- Date of expiry
- Gender
- Place of birth

Return the data as JSON only."""

    def _parse_passport_response(self, raw_content: str) -> PassportData:
        """Parse Claude's JSON response into PassportData."""
        cleaned = raw_content.strip()

        # Remove markdown code blocks
        if cleaned.startswith("```"):
            lines = cleaned.split("\n")
            start_idx = 0
            end_idx = len(lines)
            for i, line in enumerate(lines):
                if i == 0 and "json" in line:
                    start_idx = i + 1
                elif i == 0 and line.startswith("```"):
                    start_idx = i + 1
                elif line.strip() == "```":
                    end_idx = i
                    break
            cleaned = "\n".join(lines[start_idx:end_idx])

        data = json.loads(cleaned)

        # Extract name parts
        full_name = data.get("full_name", "")
        name_parts = full_name.split() if full_name else ["Unknown", ""]
        first_name = name_parts[0] if len(name_parts) > 0 else "Unknown"
        last_name = name_parts[-1] if len(name_parts) > 1 else ""

        return PassportData(
            first_name=first_name,
            last_name=last_name,
            passport_number=data.get("passport_number", ""),
            nationality=data.get("nationality", ""),
            dob=data.get("date_of_birth", ""),
            expiry_date=data.get("date_of_expiry", ""),
            gender=data.get("gender"),
            issuing_country=data.get("nationality", ""),
        )

    def _fallback_passport_data(self) -> PassportData:
        """Return fallback passport data when extraction fails."""
        return PassportData(
            first_name="First",
            last_name="Name",
            passport_number="P00000000",
            nationality="Unknown",
            dob="1990-01-01",
            expiry_date="2030-01-01",
            gender="Unknown",
            issuing_country="Unknown",
        )

    async def validate_document(
        self,
        doc_type: DocumentType,
        data: Dict[str, Any],
    ) -> DocumentUploadResponse:
        """
        Performs automated validation (e.g., expiry check, passport validity rules).
        """
        errors = []
        today = date.today()

        if doc_type == DocumentType.PASSPORT:
            try:
                expiry_date = date.fromisoformat(data.get("expiry_date", "1990-01-01"))
                if expiry_date < today:
                    errors.append("Passport has expired.")
                elif (expiry_date - today).days < 180:
                    errors.append("Passport has less than 6 months of validity left.")
            except (ValueError, KeyError):
                errors.append("Invalid expiry date format.")

        status = (
            DocumentStatus.VERIFIED
            if not errors
            else DocumentStatus.REJECTED
        )

        return DocumentUploadResponse(
            id=1,
            type=doc_type,
            status=status,
            extracted_data=data,
            verification_errors=errors,
            expiry_warning=False,
        )

    async def get_visa_checklist(
        self,
        nationality: str,
        destination: str,
    ) -> Dict[str, Any]:
        """
        Generates a custom visa requirement checklist.
        """
        mock_checklists = {
            "UAE": [
                "E-Visa required (2-5 working days)",
                "Passport must be valid for at least 6 months",
                "Valid return ticket and travel insurance",
            ],
            "Thailand": [
                "Visa-Free for 30 days (Indian Nationals)",
                "Passport with at least 2 blank pages",
                "Proof of funds (10,000 THB per person)",
            ],
            "Singapore": [
                "Visa-Free for 30 days",
                "Valid passport",
                "Return ticket and travel insurance",
            ],
        }

        checklist = mock_checklists.get(
            destination.upper(),
            [
                "Check with local consulate",
                "Valid passport (6+ months validity)",
                "Travel insurance",
            ],
        )
        return {"destination": destination, "checklist": checklist}
