#!/usr/bin/env python3
"""
NAMA Platform Seed Script
─────────────────────────
Seeds the platform with:
  - NAMA Platform tenant (L1_OWNER)
  - narayan.mallapur@gmail.com  → R0_NAMA_OWNER
  - hello@getnama.app           → R1_SUPER_ADMIN

Usage (Railway one-time command or local):
  cd /app && python scripts/seed_platform.py

Passwords are printed to stdout on first run.
Run again safely — idempotent (skips if users already exist).
"""

import os
import sys
import secrets

# Allow running from repo root or backend/
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy.orm import Session
from app.db.session import engine, SessionLocal, Base
from app.models.auth import Tenant, User, TenantType, UserRole
from app.core.security import hash_password

# ── Config ─────────────────────────────────────────────────────────────────────
OWNER_EMAIL       = "narayan.mallapur@gmail.com"
OWNER_NAME        = "Narayan Mallapur"
SUPER_ADMIN_EMAIL = "hello@getnama.app"
SUPER_ADMIN_NAME  = "NAMA Super Admin"

PLATFORM_TENANT = {
    "name": "NAMA Networks",
    "type": TenantType.L1_OWNER,
    "org_code": "NAMA-PLATFORM",
    "base_currency": "INR",
    "status": "ACTIVE",
}


def seed(db: Session) -> None:
    print("\n═══════════════════════════════════════════════════")
    print("        NAMA Platform Seed Script")
    print("═══════════════════════════════════════════════════\n")

    # ── Step 1: Platform Tenant ───────────────────────────────────────────────
    tenant = db.query(Tenant).filter_by(org_code="NAMA-PLATFORM").first()
    if not tenant:
        tenant = Tenant(**PLATFORM_TENANT)
        db.add(tenant)
        db.flush()
        print(f"✅ Created tenant: {tenant.name} (id={tenant.id})")
    else:
        print(f"⏩ Tenant already exists: {tenant.name} (id={tenant.id})")

    # ── Step 2: NAMA Owner ────────────────────────────────────────────────────
    owner = db.query(User).filter_by(email=OWNER_EMAIL).first()
    if not owner:
        owner_pw = "NamaOwner@" + secrets.token_urlsafe(6)
        owner = User(
            tenant_id=tenant.id,
            email=OWNER_EMAIL,
            hashed_password=hash_password(owner_pw),
            full_name=OWNER_NAME,
            role=UserRole.R0_NAMA_OWNER,
            is_active=True,
            profile_data={"seeded": True},
        )
        db.add(owner)
        db.flush()
        print(f"\n✅ Created NAMA Owner:")
        print(f"   Email:    {OWNER_EMAIL}")
        print(f"   Password: {owner_pw}")
        print(f"   Role:     R0_NAMA_OWNER")
        print(f"   ⚠️  Save this password — it won't be shown again!")
    else:
        print(f"\n⏩ Owner already exists: {OWNER_EMAIL}")

    # ── Step 3: Super Admin ───────────────────────────────────────────────────
    sa = db.query(User).filter_by(email=SUPER_ADMIN_EMAIL).first()
    if not sa:
        sa_pw = "NamaSuperAdmin@" + secrets.token_urlsafe(6)
        sa = User(
            tenant_id=tenant.id,
            email=SUPER_ADMIN_EMAIL,
            hashed_password=hash_password(sa_pw),
            full_name=SUPER_ADMIN_NAME,
            role=UserRole.R1_SUPER_ADMIN,
            is_active=True,
            profile_data={"seeded": True},
        )
        db.add(sa)
        db.flush()
        print(f"\n✅ Created Super Admin:")
        print(f"   Email:    {SUPER_ADMIN_EMAIL}")
        print(f"   Password: {sa_pw}")
        print(f"   Role:     R1_SUPER_ADMIN")
        print(f"   ⚠️  Save this password — it won't be shown again!")
    else:
        print(f"\n⏩ Super Admin already exists: {SUPER_ADMIN_EMAIL}")

    db.commit()
    print("\n✅ Seed complete.\n")


def main():
    # Create tables if they don't exist yet
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        seed(db)
    except Exception as e:
        db.rollback()
        print(f"\n❌ Seed failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
