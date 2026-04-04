from datetime import datetime, timedelta, timezone
import secrets

from fastapi.testclient import TestClient

from app.api.v1.demo_founder_contract_store import get_founder_payment_snapshot
from app.db.session import SessionLocal
from app.models.beta_auth import BetaSession
from app.main import app


client = TestClient(app)


def issue_admin_session(tenant_name: str) -> tuple[str, str]:
    token = "".join(character for character in tenant_name.lower() if character.isalnum())
    session_id = f"tenant-admin-{token}-{secrets.token_hex(4)}"
    session = BetaSession(
        session_id=session_id,
        email=f"admin@{token}.demo",
        display_name="Workspace Admin",
        role="customer-admin",
        scope="tenant",
        tenant_name=tenant_name,
        member_id=f"{token}-admin",
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
    return session_id, tenant_name


def test_founder_payment_status_and_recording() -> None:
    tenant_name = "Founder Payments Travel"
    session_id, returned_tenant_name = issue_admin_session(tenant_name)
    headers = {"x-nama-session-id": session_id}

    status_response = client.get("/api/v1/payments/booking/1", headers=headers)
    assert status_response.status_code == 200
    snapshot = get_founder_payment_snapshot(returned_tenant_name, 1)
    status_body = status_response.json()
    assert status_body["booking_id"] == snapshot["booking_id"]
    assert status_body["booking_status"] == snapshot["booking_status"].value
    assert status_body["quote_total"] == snapshot["quote_total"]
    assert status_body["deposit_due"] == snapshot["deposit_due"]
    assert status_body["deposit_state"] == snapshot["deposit_state"]
    assert status_body["settlement_state"] == snapshot["settlement_state"]
    assert status_body["bank_ref"] == snapshot["bank_ref"]
    assert status_body["currency"] == snapshot["currency"]

    record_response = client.post(
        "/api/v1/payments/booking/1/record",
        json={"bank_ref": "UTR-PAY-101"},
        headers=headers,
    )
    assert record_response.status_code == 200
    record_body = record_response.json()
    assert record_body["booking_id"] == 1
    assert record_body["booking_status"] == "CONFIRMED"
    assert record_body["deposit_state"] == "Recorded"
    assert record_body["bank_ref"] == "UTR-PAY-101"
    assert record_body["currency"] == "INR"

    refreshed_status = client.get("/api/v1/payments/booking/1", headers=headers)
    assert refreshed_status.status_code == 200
    refreshed_body = refreshed_status.json()
    assert refreshed_body["deposit_state"] == "Recorded"
    assert refreshed_body["settlement_state"] == "Recorded"
    assert refreshed_body["bank_ref"] == "UTR-PAY-101"
