from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.db.session import Base

class TenantType(str, enum.Enum):
    L1_OWNER = "L1_OWNER"
    L2_SUPER_ADMIN = "L2_SUPER_ADMIN"
    L3_TRAVEL_CO = "L3_TRAVEL_CO"
    L4_SUB_USER = "L4_SUB_USER"
    L5_SUB_AGENT = "L5_SUB_AGENT"

class UserRole(str, enum.Enum):
    R0_NAMA_OWNER = "R0_NAMA_OWNER"
    R1_SUPER_ADMIN = "R1_SUPER_ADMIN"
    R2_ORG_ADMIN = "R2_ORG_ADMIN"
    R3_SALES_MANAGER = "R3_SALES_MANAGER"
    R4_OPS_EXECUTIVE = "R4_OPS_EXECUTIVE"
    R5_FINANCE_ADMIN = "R5_FINANCE_ADMIN"
    R6_SUB_AGENT = "R6_SUB_AGENT"
    R7_CLIENT_PORTAL = "R7_CLIENT_PORTAL"

class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    parent_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    name = Column(String, nullable=False)
    type = Column(SQLEnum(TenantType), nullable=False)
    org_code = Column(String, unique=True, index=True)
    base_currency = Column(String, default="INR")
    status = Column(String, default="ACTIVE")
    settings = Column(JSON, default={})
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    children = relationship("Tenant", backref=ForeignKey("parent_id"), remote_side=[id])
    users = relationship("User", back_populates="tenant")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    role = Column(SQLEnum(UserRole), nullable=False)
    is_active = Column(Boolean, default=True)
    profile_data = Column(JSON, default={})
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    tenant = relationship("Tenant", back_populates="users")
