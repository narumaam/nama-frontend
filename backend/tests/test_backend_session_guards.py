from datetime import datetime, timedelta, timezone
import secrets

from fastapi.testclient import TestClient

from app.db.session import SessionLocal
from app.main import app
from app.models.beta_auth import BetaSession


client = TestClient(app)


def issue_admin_session(tenant_name: str) -> str:
    tenant_token = "".join(character for character in tenant_name.lower() if character.isalnum())
    session_id = f"tenant-admin-{tenant_token}-{secrets.token_hex(4)}"
    session = BetaSession(
        session_id=session_id,
        email=f"admin@{tenant_token}.demo",
        display_name="Workspace Admin",
        role="customer-admin",
        scope="tenant",
        tenant_name=tenant_name,
        member_id=f"{tenant_token}-admin",
        member_status="Active",
        designation="Workspace Admin",
        team="Leadership",
        source="backend-demo",
        granted_at=datetime.now(timezone.utc).isoformat(),
        expires_at=(datetime.now(timezone.utc) + timedelta(hours=8)).isoformat(),
        revoked_at=None,
    )
    db = SessionLocal()
    try:
        db.add(session)
        db.commit()
    finally:
        db.close()
    return session_id


def test_business_route_accepts_contract_session_header() -> None:
    session_id = issue_admin_session("Guarded Travel")

    response = client.post(
        "/api/v1/bookings/1/confirm",
        headers={"x-nama-session-id": session_id},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == 1
    assert body["status"] == "CONFIRMED"


def test_business_route_rejects_revoked_contract_session() -> None:
    session_id = issue_admin_session("Guarded Travel")
    revoke = client.post(
        "/api/v1/sessions/tenant/revoke",
        headers={"x-nama-session-id": session_id},
        json={
          "scope": "tenant",
          "tenant_name": "Guarded Travel",
          "session_id": session_id,
        },
    )
    assert revoke.status_code == 200

    response = client.post(
        "/api/v1/bookings/1/confirm",
        headers={"x-nama-session-id": session_id},
    )

    assert response.status_code == 401
