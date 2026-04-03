from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_tenant_invites_health() -> None:
    response = client.get("/api/v1/tenant-invites/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ready", "module": "TENANT_INVITES"}


def test_tenant_invites_list_contract() -> None:
    response = client.get("/api/v1/tenant-invites", params={"tenant_name": "Aurora Reserve Travel"})
    assert response.status_code == 200
    body = response.json()
    assert body["tenant_name"] == "Aurora Reserve Travel"
    assert body["source"] == "backend-demo"
    assert len(body["invites"]) >= 3
    assert any(invite["status"] == "Accepted" for invite in body["invites"])


def test_create_tenant_invite() -> None:
    response = client.post(
        "/api/v1/tenant-invites",
        json={
            "tenant_name": "Aurora Reserve Travel",
            "invite": {
                "tenant_name": "Aurora Reserve Travel",
                "id": "invite-meera-shah",
                "name": "Meera Shah",
                "email": "meera@aurora.example",
                "role": "finance",
                "designation": "Accounts Lead",
                "team": "Billing",
                "reports_to": "Finance Lead",
                "responsibility": "Billing and reconciliation",
                "status": "Pending",
                "source": "manual",
            },
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["tenant_name"] == "Aurora Reserve Travel"
    assert body["status"] == "Pending"
    assert body["email"] == "meera@aurora.example"
    assert body["invite_token"]
    assert body["token_expires_at"]


def test_bulk_create_tenant_invites() -> None:
    response = client.post(
        "/api/v1/tenant-invites/bulk",
        json={
            "tenant_name": "Aurora Reserve Travel",
            "invites": [
                {
                    "tenant_name": "Aurora Reserve Travel",
                    "id": "invite-aisha-khan",
                    "name": "Aisha Khan",
                    "email": "aisha@aurora.example",
                    "role": "sales",
                    "designation": "Senior Executive",
                    "team": "Inbound Desk",
                    "status": "Pending",
                    "reports_to": "Sales Manager",
                    "responsibility": "Lead qualification",
                    "source": "bulk",
                },
                {
                    "tenant_name": "Aurora Reserve Travel",
                    "id": "invite-rohan-iyer",
                    "name": "Rohan Iyer",
                    "email": "rohan@aurora.example",
                    "role": "operations",
                    "designation": "Operations Lead",
                    "team": "Luxury Desk",
                    "status": "Draft",
                    "reports_to": "Operations Lead",
                    "responsibility": "Booking handoff",
                    "source": "bulk",
                },
            ],
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["tenant_name"] == "Aurora Reserve Travel"
    assert len(body["invites"]) >= 3
    assert any(invite["email"] == "aisha@aurora.example" for invite in body["invites"])


def test_accept_tenant_invite_promotes_member() -> None:
    create_response = client.post(
        "/api/v1/tenant-invites",
        json={
            "tenant_name": "Aurora Reserve Travel",
            "invite": {
                "tenant_name": "Aurora Reserve Travel",
                "id": "invite-priya-das",
                "name": "Priya Das",
                "email": "priya@aurora.example",
                "role": "sales",
                "designation": "Travel Consultant",
                "team": "Inbound Desk",
                "status": "Pending",
                "reports_to": "Sales Manager",
                "responsibility": "CRM follow-up",
                "source": "manual",
            },
        },
    )
    invite_body = create_response.json()
    invite_id = invite_body["id"]
    invite_token = invite_body["invite_token"]

    accept_response = client.post(
        "/api/v1/tenant-invites/accept",
        json={
            "tenant_name": "Aurora Reserve Travel",
            "invite_id": invite_id,
            "invite_token": invite_token,
            "access_code": "Priya-sales-01",
        },
    )
    assert accept_response.status_code == 200
    accept_body = accept_response.json()
    invite_body = accept_body["invite"]
    assert invite_body["status"] == "Accepted"
    assert invite_body["accepted_at"]
    assert invite_body["token_used_at"]
    assert accept_body["credential_access_code"] == "Priya-sales-01"

    member_response = client.get(
        "/api/v1/tenant-members",
        params={"tenant_name": "Aurora Reserve Travel"},
    )
    member_body = member_response.json()
    assert any(member["email"] == "priya@aurora.example" and member["status"] == "Active" for member in member_body["members"])


def test_accept_tenant_invite_rejects_invalid_token() -> None:
    create_response = client.post(
        "/api/v1/tenant-invites",
        json={
            "tenant_name": "Aurora Reserve Travel",
            "invite": {
                "tenant_name": "Aurora Reserve Travel",
                "id": "invite-token-check",
                "name": "Token Check",
                "email": "token.check@aurora.example",
                "role": "viewer",
                "designation": "Reviewer",
                "team": "Reporting",
                "status": "Pending",
                "reports_to": "Customer Admin",
                "responsibility": "Artifact review",
                "source": "manual",
            },
        },
    )
    invite_id = create_response.json()["id"]

    accept_response = client.post(
        "/api/v1/tenant-invites/accept",
        json={
            "tenant_name": "Aurora Reserve Travel",
            "invite_id": invite_id,
            "invite_token": "wrong-token",
            "access_code": "Viewer-pass-01",
        },
    )
    assert accept_response.status_code == 401
    assert accept_response.json()["detail"] == "Invalid invite token"
