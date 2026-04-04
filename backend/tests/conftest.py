import pytest

from app.db.session import SessionLocal
from app.models.beta_auth import (
    BetaAuthAuditEvent,
    BetaCredential,
    BetaSession,
    BetaTenantInvite,
    BetaTenantMember,
)
from app.api.v1.demo_founder_contract_store import reset_founder_contract_state


@pytest.fixture(autouse=True)
def reset_beta_auth_tables():
    reset_founder_contract_state()
    db = SessionLocal()
    try:
        db.query(BetaAuthAuditEvent).delete()
        db.query(BetaSession).delete()
        db.query(BetaCredential).delete()
        db.query(BetaTenantInvite).delete()
        db.query(BetaTenantMember).delete()
        db.commit()
    finally:
        db.close()
