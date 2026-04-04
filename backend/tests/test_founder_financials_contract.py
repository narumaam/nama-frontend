from datetime import datetime, timedelta, timezone
import secrets

from fastapi.testclient import TestClient

from app.api.v1.demo_founder_contract_store import (
    get_founder_booking_profit,
    summarize_founder_financials,
)
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


def test_founder_financials_profit_reconcile_and_summary() -> None:
    tenant_name = "Founder Finance Travel"
    session_id, returned_tenant_name = issue_admin_session(tenant_name)
    headers = {"x-nama-session-id": session_id}

    profit_response = client.get("/api/v1/financials/booking/1/profit", headers=headers)
    assert profit_response.status_code == 200
    assert profit_response.json() == get_founder_booking_profit(returned_tenant_name, 1)

    reconcile_response = client.post(
        "/api/v1/financials/reconcile/101",
        params={"bank_ref": "UTR-FOUND-101"},
        headers=headers,
    )
    assert reconcile_response.status_code == 200
    reconcile_body = reconcile_response.json()
    assert reconcile_body["id"] == 101
    assert reconcile_body["booking_id"] == 1
    assert reconcile_body["status"] == "RECONCILED"
    assert reconcile_body["reference"] == "UTR-FOUND-101"

    summary_response = client.get("/api/v1/financials/summary", headers=headers)
    assert summary_response.status_code == 200
    summary_body = summary_response.json()
    expected_summary = summarize_founder_financials(returned_tenant_name)
    expected_tenant_id = sum(ord(character) for character in returned_tenant_name) % 10_000
    assert summary_body["tenant_id"] == expected_tenant_id
    assert summary_body["balance_available"] == expected_summary["balance_available"]
    assert summary_body["pending_settlements"] == expected_summary["pending_settlements"]
    assert summary_body["currency"] == expected_summary["currency"]
    assert summary_body["last_reconciled"] == expected_summary["last_reconciled"].isoformat()
