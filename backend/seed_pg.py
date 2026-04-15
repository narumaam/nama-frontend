"""Seed SQLite stress test DB with demo users.

Usage:
    cd backend
    DATABASE_URL=sqlite:////tmp/nama_perf.db python3 seed_pg.py
"""

import os
import sys

# Ensure app package is importable
sys.path.insert(0, os.path.dirname(__file__))

# Override DATABASE_URL if provided via environment
os.environ.setdefault("DATABASE_URL", "sqlite:////tmp/nama_perf.db")

from dotenv import load_dotenv
load_dotenv()

from app.db.session import engine, SessionLocal, Base
import app.models.auth        # noqa: registers Tenant, User
import app.models.leads       # noqa
import app.models.itineraries # noqa
import app.models.vendors     # noqa
import app.models.bookings    # noqa
import app.models.payments    # noqa
import app.models.ai_usage    # noqa

from app.models.auth import Tenant, User, TenantType, UserRole
from passlib.context import CryptContext

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

DEMO_EMAIL    = "demo@namatest.dev"
DEMO_PASSWORD = "Demo123!"
DEMO_ORG      = "NAMATEST"

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Idempotent — skip if already seeded
        existing = db.query(User).filter(User.email == DEMO_EMAIL).first()
        if existing:
            print(f"Already seeded (tenant_id={existing.tenant_id})")
            return existing.tenant_id, existing.id

        # 1. Create L3 tenant (Travel Agency)
        tenant = Tenant(
            name="NAMA Stress Test Agency",
            type=TenantType.L3_TRAVEL_CO,
            org_code=DEMO_ORG,
            base_currency="INR",
            status="ACTIVE",
            settings={},
        )
        db.add(tenant)
        db.flush()  # get tenant.id

        # 2. Create R3 Sales Manager user
        user = User(
            tenant_id=tenant.id,
            email=DEMO_EMAIL,
            hashed_password=pwd_ctx.hash(DEMO_PASSWORD),
            full_name="Stress Test Sales Agent",
            role=UserRole.R3_SALES_MANAGER,
            is_active=True,
        )
        db.add(user)

        # 3. Create R2 Org Admin user for manager/analytics routes
        admin = User(
            tenant_id=tenant.id,
            email="admin@namatest.dev",
            hashed_password=pwd_ctx.hash(DEMO_PASSWORD),
            full_name="Stress Test Admin",
            role=UserRole.R2_ORG_ADMIN,
            is_active=True,
        )
        db.add(admin)
        db.commit()
        db.refresh(user)
        db.refresh(admin)

        print(f"Seeded: demo@namatest.dev + admin@namatest.dev")
        return tenant.id, user.id

    finally:
        db.close()


if __name__ == "__main__":
    tid, uid = seed()
