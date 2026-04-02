import os
from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def health_check():
    stripe_enabled = bool(os.getenv("STRIPE_SECRET_KEY"))
    razorpay_enabled = bool(os.getenv("RAZORPAY_KEY_ID") and os.getenv("RAZORPAY_KEY_SECRET"))
    mode = "live" if stripe_enabled or razorpay_enabled else "mock"
    return {
        "status": "ready",
        "module": "M6 Secure Payments",
        "mode": mode,
        "providers": {
            "stripe": "configured" if stripe_enabled else "not_configured",
            "razorpay": "configured" if razorpay_enabled else "not_configured",
        },
    }
