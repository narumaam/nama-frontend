from datetime import datetime, timedelta, timezone
import secrets

from fastapi.testclient import TestClient

from app.api.v1.demo_founder_contract_store import list_founder_bookings
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


def test_founder_bookings_list_confirm_cancel_and_voucher() -> None:
    tenant_name = "Founder Flow Travel"
    session_id, returned_tenant_name = issue_admin_session(tenant_name)
    headers = {"x-nama-session-id": session_id}

    all_response = client.get("/api/v1/bookings/", headers=headers)
    assert all_response.status_code == 200
    all_bookings = all_response.json()
    assert len(all_bookings) == len(list_founder_bookings(returned_tenant_name))

    confirmed_response = client.get("/api/v1/bookings/", params={"status": "CONFIRMED"}, headers=headers)
    assert confirmed_response.status_code == 200
    confirmed_bookings = confirmed_response.json()
    assert all(booking["status"] == "CONFIRMED" for booking in confirmed_bookings)
    assert len(confirmed_bookings) <= len(all_bookings)

    confirm_response = client.post("/api/v1/bookings/1/confirm", headers=headers)
    assert confirm_response.status_code == 200
    confirm_body = confirm_response.json()
    assert confirm_body["id"] == 1
    assert confirm_body["status"] == "CONFIRMED"
    assert confirm_body["items"][0]["confirmation_number"] == "CNF-0001"

    voucher_response = client.post("/api/v1/bookings/1/voucher", headers=headers)
    assert voucher_response.status_code == 200
    voucher_body = voucher_response.json()
    assert voucher_body["booking_id"] == 1
    assert voucher_body["voucher_id"] == "VCH-0001"
    assert voucher_body["download_url"].endswith("VCH-0001.pdf")

    cancel_response = client.delete("/api/v1/bookings/2", headers=headers)
    assert cancel_response.status_code == 200
    assert cancel_response.json()["status"] == "CANCELLED"

    voucher_after_cancel = client.post("/api/v1/bookings/2/voucher", headers=headers)
    assert voucher_after_cancel.status_code == 409

    cancelled_response = client.get("/api/v1/bookings/", params={"status": "CANCELLED"}, headers=headers)
    assert cancelled_response.status_code == 200
    assert any(booking["id"] == 2 for booking in cancelled_response.json())
