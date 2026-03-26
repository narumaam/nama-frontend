from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.corporate import (
    CorporatePO, CorporatePOCreate, 
    FixedDeparture, FixedDepartureCreate, 
    SeatBookingRequest
)
from app.models.corporate import CorporatePO as POModel
from app.models.corporate import FixedDeparture as DepartureModel
from app.agents.corporate import CorporateAgent
from app.api.v1.deps import get_current_user, RoleChecker
from app.models.auth import UserRole
from typing import List, Optional

router = APIRouter()
corporate_agent = CorporateAgent()

# --- Corporate POs ---
@router.post("/pos", response_model=CorporatePO)
def create_corporate_po(
    po_in: CorporatePOCreate,
    current_user = Depends(RoleChecker([UserRole.R2_ORG_ADMIN, UserRole.R5_FINANCE_ADMIN])),
    db: Session = Depends(get_db)
):
    """
    Create a new Corporate Purchase Order (M13).
    """
    db_po = POModel(**po_in.model_dump())
    db.add(db_po)
    db.commit()
    db.refresh(db_po)
    return db_po

@router.get("/pos", response_model=List[CorporatePO])
def list_corporate_pos(
    client_org_id: Optional[int] = None,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all Corporate POs for the current tenant or a specific client organization.
    """
    query = db.query(POModel).filter(POModel.tenant_id == current_user.tenant_id)
    if client_org_id:
        query = query.filter(POModel.client_org_id == client_org_id)
    return query.all()

# --- Fixed Departures ---
@router.post("/departures", response_model=FixedDeparture)
def create_fixed_departure(
    dep_in: FixedDepartureCreate,
    current_user = Depends(RoleChecker([UserRole.R2_ORG_ADMIN, UserRole.R4_OPS_EXECUTIVE])),
    db: Session = Depends(get_db)
):
    """
    Create a new fixed departure group (M13).
    """
    db_dep = DepartureModel(**dep_in.model_dump())
    db.add(db_dep)
    db.commit()
    db.refresh(db_dep)
    return db_dep

@router.get("/departures", response_model=List[FixedDeparture])
def list_fixed_departures(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all active fixed departures for the organization.
    """
    return db.query(DepartureModel).filter(DepartureModel.tenant_id == current_user.tenant_id).all()

@router.post("/book-seat", response_model=FixedDeparture)
async def book_seats_for_departure(
    request: SeatBookingRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Handle seat booking for a fixed departure, managing real-time inventory.
    """
    db_dep = db.query(DepartureModel).filter(DepartureModel.id == request.departure_id).first()
    
    if not db_dep:
        raise HTTPException(status_code=404, detail="Departure not found.")
        
    if db_dep.available_seats < request.seats_count:
        raise HTTPException(status_code=400, detail="Not enough seats available.")
        
    # Real-time inventory deduction
    db_dep.available_seats -= request.seats_count
    db.commit()
    db.refresh(db_dep)
    
    return db_dep
