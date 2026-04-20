"""
NAMA OS — Visa Intelligence API  v1.0
──────────────────────────────────────
Provides AI-powered visa requirement checklists using OpenRouter LLM,
with a static dictionary fallback.

Endpoints:
  GET  /visa/requirements?origin=&destination=   Get visa checklist (LLM + fallback)
  POST /visa/passport-upload                      Passport image upload placeholder
  GET  /visa/countries                            Supported countries list
"""

import json
import logging
import os
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.v1.deps import require_tenant

logger = logging.getLogger(__name__)
router = APIRouter()

OPENROUTER_BASE  = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_MODEL = "meta-llama/llama-3.3-70b-instruct:free"

# ─── Static fallback dictionary ──────────────────────────────────────────────

VISA_FALLBACK: Dict[str, Dict[str, Any]] = {
    "IN_ID": {  # India → Indonesia (Bali)
        "visa_type": "Visa on Arrival",
        "required": True,
        "processing_time": "On arrival (immediate)",
        "fee_usd": 35,
        "fee_inr": 2900,
        "validity": "30 days, extendable once to 60 days",
        "entry": "Single entry",
        "documents": [
            "Passport valid for at least 6 months",
            "Return/onward flight ticket",
            "Proof of sufficient funds (approx. USD 1,000)",
            "Hotel booking confirmation",
            "Completed arrival card (given on plane)",
        ],
        "notes": "Available at major international airports including Ngurah Rai (Bali), Soekarno-Hatta (Jakarta). E-VOA also available.",
        "source": "static_fallback",
    },
    "IN_TH": {  # India → Thailand
        "visa_type": "Visa Exemption / Visa on Arrival",
        "required": False,
        "processing_time": "Visa exemption — no visa required for Indian passport holders (30 days)",
        "fee_usd": 0,
        "fee_inr": 0,
        "validity": "30 days",
        "entry": "Single entry (extendable)",
        "documents": [
            "Passport valid for at least 6 months",
            "Return/onward ticket",
            "Proof of accommodation",
            "Proof of funds THB 10,000 per person",
        ],
        "notes": "As of 2024, India–Thailand visa-free arrangement in place. Confirm latest status before travel.",
        "source": "static_fallback",
    },
    "IN_MV": {  # India → Maldives
        "visa_type": "Visa on Arrival",
        "required": True,
        "processing_time": "On arrival (immediate, 30 days)",
        "fee_usd": 0,
        "fee_inr": 0,
        "validity": "30 days",
        "entry": "Single entry",
        "documents": [
            "Passport valid for at least 6 months",
            "Return/onward ticket",
            "Hotel/resort booking confirmation",
            "Proof of sufficient funds",
        ],
        "notes": "Free visa on arrival for all nationalities including Indian citizens.",
        "source": "static_fallback",
    },
    "IN_AE": {  # India → UAE
        "visa_type": "Tourist Visa (pre-apply)",
        "required": True,
        "processing_time": "3–5 working days",
        "fee_usd": 90,
        "fee_inr": 7500,
        "validity": "30 days (60-day option available)",
        "entry": "Single or multiple entry",
        "documents": [
            "Passport valid for at least 6 months",
            "Recent passport-size photographs (white background)",
            "Confirmed return flight ticket",
            "Hotel booking confirmation",
            "Bank statement (last 3 months)",
            "Copy of PAN card",
        ],
        "notes": "Apply through airlines (Air Arabia, flydubai, Emirates) or DNATA/VFS Global.",
        "source": "static_fallback",
    },
    "IN_SG": {  # India → Singapore
        "visa_type": "Tourist Visa (pre-apply)",
        "required": True,
        "processing_time": "3–5 business days",
        "fee_usd": 30,
        "fee_inr": 2500,
        "validity": "30 days (single entry) or 60 days (multiple entry)",
        "entry": "Single or multiple",
        "documents": [
            "Passport valid for at least 6 months with at least 2 blank pages",
            "Recent passport photograph",
            "Completed visa application form",
            "Confirmed return flight ticket",
            "Hotel booking",
            "Bank statement (last 3 months, min. SGD 1,500 balance)",
            "Income Tax Returns or salary slips",
        ],
        "notes": "Apply via Singapore Immigration & Checkpoints Authority (ICA) or authorised agencies.",
        "source": "static_fallback",
    },
}


def _fallback_key(origin: str, destination: str) -> str:
    """Normalise country codes to uppercase 2-letter ISO."""
    return f"{origin.upper()[:2]}_{destination.upper()[:2]}"


def _get_fallback(origin: str, destination: str) -> Optional[Dict[str, Any]]:
    key = _fallback_key(origin, destination)
    return VISA_FALLBACK.get(key)


# ─── Pydantic schemas ─────────────────────────────────────────────────────────

class VisaChecklist(BaseModel):
    origin:          str
    destination:     str
    visa_type:       str
    required:        bool
    processing_time: str
    fee_usd:         float
    fee_inr:         float
    validity:        str
    entry:           str
    documents:       List[str]
    notes:           str
    source:          str  # "llm" | "static_fallback" | "llm_error_fallback"


class PassportUploadResponse(BaseModel):
    message: str
    filename: Optional[str] = None
    extracted: Optional[Dict[str, Any]] = None


# ─── LLM Helper ───────────────────────────────────────────────────────────────

async def _fetch_visa_from_llm(origin: str, destination: str) -> Optional[Dict[str, Any]]:
    """
    Call OpenRouter Llama 3.3 to generate a structured visa checklist.
    Returns parsed dict or None on failure.
    """
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        logger.warning("OPENROUTER_API_KEY not set; skipping LLM visa lookup")
        return None

    prompt = f"""You are a travel visa expert. Given the traveller's origin and destination country, return a JSON object describing visa requirements.

Origin country: {origin}
Destination country: {destination}

Return ONLY valid JSON (no markdown, no explanation) with these exact keys:
{{
  "visa_type": "<string>",
  "required": <true|false>,
  "processing_time": "<string>",
  "fee_usd": <number>,
  "fee_inr": <number>,
  "validity": "<string>",
  "entry": "<Single entry|Multiple entry|Varies>",
  "documents": ["<item1>", "<item2>", ...],
  "notes": "<string with any important caveats>"
}}

Be accurate, concise, and based on current (2025–2026) visa regulations. If information is uncertain, note it in the "notes" field."""

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                OPENROUTER_BASE,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://nama-os.vercel.app",
                    "X-Title": "NAMA OS Visa Intelligence",
                },
                json={
                    "model": OPENROUTER_MODEL,
                    "messages": [
                        {"role": "user", "content": prompt}
                    ],
                    "max_tokens": 800,
                    "temperature": 0.1,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            raw_content = data["choices"][0]["message"]["content"].strip()

            # Strip markdown code fences if present
            if raw_content.startswith("```"):
                raw_content = raw_content.split("```")[1]
                if raw_content.startswith("json"):
                    raw_content = raw_content[4:]
            raw_content = raw_content.strip()

            parsed = json.loads(raw_content)
            parsed["source"] = "llm"
            return parsed

    except json.JSONDecodeError as e:
        logger.warning(f"LLM returned invalid JSON for visa lookup {origin}->{destination}: {e}")
        return None
    except Exception as e:
        logger.error(f"LLM visa lookup failed for {origin}->{destination}: {e}")
        return None


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/requirements", response_model=VisaChecklist)
async def get_visa_requirements(
    origin:      str = Query(..., description="Origin country (e.g. 'India' or 'IN')"),
    destination: str = Query(..., description="Destination country (e.g. 'Bali' or 'Indonesia' or 'ID')"),
    tenant_id: int = Depends(require_tenant),
) -> VisaChecklist:
    """
    Return a visa requirements checklist for a given origin → destination pair.
    First attempts LLM (OpenRouter Llama 3.3), falls back to static dictionary.
    """
    # 1. Try LLM
    llm_result = await _fetch_visa_from_llm(origin, destination)
    if llm_result:
        return VisaChecklist(
            origin=origin,
            destination=destination,
            visa_type=llm_result.get("visa_type", "Tourist Visa"),
            required=llm_result.get("required", True),
            processing_time=llm_result.get("processing_time", "Varies"),
            fee_usd=float(llm_result.get("fee_usd", 0)),
            fee_inr=float(llm_result.get("fee_inr", 0)),
            validity=llm_result.get("validity", "30 days"),
            entry=llm_result.get("entry", "Single entry"),
            documents=llm_result.get("documents", []),
            notes=llm_result.get("notes", ""),
            source="llm",
        )

    # 2. Fallback: static dictionary (exact key match)
    fallback = _get_fallback(origin, destination)
    if fallback:
        return VisaChecklist(
            origin=origin,
            destination=destination,
            **{k: v for k, v in fallback.items() if k != "source"},
            source="static_fallback",
        )

    # 3. Generic fallback when nothing matches
    return VisaChecklist(
        origin=origin,
        destination=destination,
        visa_type="Tourist Visa (verify before travel)",
        required=True,
        processing_time="7–15 business days (typical)",
        fee_usd=50.0,
        fee_inr=4200.0,
        validity="30 days",
        entry="Single entry",
        documents=[
            "Valid passport (6+ months validity, 2 blank pages)",
            "Completed visa application form",
            "Recent passport-size photographs",
            "Confirmed return flight ticket",
            "Hotel/accommodation booking confirmation",
            "Bank statement (last 3 months)",
            "Travel insurance (recommended)",
        ],
        notes=f"Visa requirements for {origin} → {destination} not found in database. Please verify with the destination country's embassy or consulate.",
        source="llm_error_fallback",
    )


@router.post("/passport-upload", response_model=PassportUploadResponse)
async def upload_passport(
    file: UploadFile = File(...),
    tenant_id: int = Depends(require_tenant),
) -> PassportUploadResponse:
    """
    Accept a passport image upload for OCR processing.
    Currently returns a placeholder response — full OCR pipeline planned for V6.
    """
    if not file.content_type or not file.content_type.startswith(("image/", "application/pdf")):
        raise HTTPException(
            status_code=400,
            detail="Only image files (JPEG, PNG, PDF) are accepted for passport upload.",
        )

    # Read and discard — placeholder until OCR pipeline is wired
    await file.read()

    return PassportUploadResponse(
        message="Passport uploaded successfully. OCR processing is queued (V6 feature — full extraction coming soon).",
        filename=file.filename,
        extracted={
            "status": "pending",
            "note": "Full passport OCR with MRZ parsing is planned for V6 (Voice + Document Intelligence sprint).",
        },
    )


@router.get("/countries")
async def list_supported_countries() -> Dict[str, Any]:
    """
    Return the list of country pairs with static fallback data available,
    plus the full ISO country list for the UI country picker.
    """
    static_pairs = list(VISA_FALLBACK.keys())

    popular_routes = [
        {"origin": "India", "origin_code": "IN", "destination": "Indonesia (Bali)", "destination_code": "ID"},
        {"origin": "India", "origin_code": "IN", "destination": "Thailand",         "destination_code": "TH"},
        {"origin": "India", "origin_code": "IN", "destination": "Maldives",         "destination_code": "MV"},
        {"origin": "India", "origin_code": "IN", "destination": "UAE (Dubai)",      "destination_code": "AE"},
        {"origin": "India", "origin_code": "IN", "destination": "Singapore",        "destination_code": "SG"},
    ]

    return {
        "static_pairs": static_pairs,
        "popular_routes": popular_routes,
        "llm_enabled": bool(os.getenv("OPENROUTER_API_KEY")),
        "note": "LLM-powered lookup available for any origin/destination pair when OPENROUTER_API_KEY is configured.",
    }
