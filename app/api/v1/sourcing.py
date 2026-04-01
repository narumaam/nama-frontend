from fastapi import APIRouter
router = APIRouter()
@router.get("/health")
def health_check():
    return {"status": "ready", "module": "M4 Global Sourcing"}
