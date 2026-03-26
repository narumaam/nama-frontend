from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base
from app.schemas.corporate import POStatus

class CorporatePO(Base):
    """
    Corporate Purchase Orders (M13).
    Handles budget enforcement and approval workflows for B2B clients.
    """
    __tablename__ = "corporate_pos"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    client_org_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    po_number = Column(String, nullable=False, index=True)
    status = Column(SQLEnum(POStatus), default=POStatus.DRAFT)
    budget_threshold = Column(Float, nullable=False)
    currency = Column(String, default="INR")
    description = Column(String, nullable=True)
    
    # Stores approval chain: [{"user_id": 1, "status": "APPROVED", "timestamp": "..."}]
    approval_chain = Column(JSON, default=[]) 
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class FixedDeparture(Base):
    """
    Fixed Departures & Seat Management (M13).
    Manages group inventory and seat sales.
    """
    __tablename__ = "fixed_departures"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    title = Column(String, nullable=False, index=True)
    departure_date = Column(DateTime(timezone=True), nullable=False)
    return_date = Column(DateTime(timezone=True), nullable=False)
    total_seats = Column(Integer, nullable=False)
    available_seats = Column(Integer, nullable=False)
    base_price = Column(Float, nullable=False)
    currency = Column(String, default="INR")
    status = Column(String, default="ACTIVE") # ACTIVE, CLOSED, COMPLETED
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
