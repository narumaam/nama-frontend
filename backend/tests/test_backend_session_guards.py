from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def issue_admin_session(tenant_name: str) -> str:
    tenant_token = "".join(character for character in tenant_name.lower() if character.isalnum())[:8].upper()
    response = client.post(
        "/api/v1/sessions/tenant",
        json={
            "email": f"admin@{''.join(character for character in tenant_name.lower() if character.isalnum())}.demo",
            "scope": "tenant",
            "tenant_name": tenant_name,
            "access_code": f"NAMA-{tenant_token}-ADMIN",
        },
    )
    assert response.status_code == 200
    return response.json()["id"]


def test_business_route_accepts_contract_session_header() -> None:
    session_id = issue_admin_session("Guarded Travel")

    response = client.post(
        "/api/v1/bookings/1001/confirm",
        headers={"x-nama-session-id": session_id},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == 1001
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
        "/api/v1/bookings/1001/confirm",
        headers={"x-nama-session-id": session_id},
    )

    assert response.status_code == 401
