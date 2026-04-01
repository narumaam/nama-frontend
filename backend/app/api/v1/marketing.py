from fastapi import APIRouter
router = APIRouter()
@router.get("/health")
def health_check():
    return {"status": "ready", "module": "M9 Marketing OS"}
