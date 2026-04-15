from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, Dict, Any
from app.models.auth import TenantType, UserRole

class TenantBase(BaseModel):
    name: str
    type: TenantType
    org_code: str
    base_currency: Optional[str] = "INR"
    parent_id: Optional[int] = None

class TenantCreate(TenantBase):
    pass

class Tenant(TenantBase):
    id: int
    status: str
    settings: Dict[str, Any]
    
    model_config = ConfigDict(from_attributes=True)

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: UserRole
    tenant_id: int

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_active: bool
    
    model_config = ConfigDict(from_attributes=True)
