import os
from fastapi import APIRouter

router = APIRouter()


def _status(enabled: bool, live_label: str = "CONNECTED") -> str:
    return live_label if enabled else "NOT_CONFIGURED"


@router.get("/health")
def health_check():
    active_keys = sum(
        bool(value)
        for value in (
            os.getenv("WHATSAPP_API_TOKEN"),
            os.getenv("WHATSAPP_PHONE_ID"),
            os.getenv("STRIPE_SECRET_KEY"),
            os.getenv("RAZORPAY_KEY_ID"),
            os.getenv("RESEND_API_KEY"),
            os.getenv("SENDGRID_API_KEY"),
            os.getenv("BOKUN_API_KEY"),
            os.getenv("AMADEUS_API_KEY"),
            os.getenv("TBO_CLIENT_ID"),
        )
    )
    return {"status": "ready", "module": "M12 Integration Vault", "active_keys": active_keys}

@router.get("/vault/status")
def get_vault_status():
    whatsapp_enabled = bool(os.getenv("WHATSAPP_API_TOKEN") and os.getenv("WHATSAPP_PHONE_ID"))
    stripe_enabled = bool(os.getenv("STRIPE_SECRET_KEY"))
    razorpay_enabled = bool(os.getenv("RAZORPAY_KEY_ID") and os.getenv("RAZORPAY_KEY_SECRET"))
    resend_enabled = bool(os.getenv("RESEND_API_KEY"))
    sendgrid_enabled = bool(os.getenv("SENDGRID_API_KEY"))
    bokun_enabled = bool(os.getenv("BOKUN_API_KEY") and os.getenv("BOKUN_API_SECRET"))
    amadeus_enabled = bool(os.getenv("AMADEUS_API_KEY") and os.getenv("AMADEUS_API_SECRET"))
    tbo_enabled = bool(os.getenv("TBO_CLIENT_ID") and os.getenv("TBO_CLIENT_SECRET"))

    return {
        "whatsapp": _status(whatsapp_enabled),
        "stripe": _status(stripe_enabled, "LIVE_READY"),
        "razorpay": _status(razorpay_enabled, "LIVE_READY"),
        "resend": _status(resend_enabled),
        "sendgrid": _status(sendgrid_enabled),
        "bokun": _status(bokun_enabled, "ACTIVE"),
        "amadeus": _status(amadeus_enabled, "ACTIVE"),
        "tbo": _status(tbo_enabled, "ACTIVE"),
    }
