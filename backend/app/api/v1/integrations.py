from fastapi import APIRouter
from typing import Dict

router = APIRouter()

@router.get("/health")
def health_check():
    return {"status": "ready", "module": "M12 Integration Vault", "active_keys": 8}

@router.get("/vault/status")
def get_vault_status():
    return {
        "whatsapp": "CONNECTED",
        "stripe": "READY",
        "gmail": "CONNECTED",
        "bokun": "ACTIVE"
    }
