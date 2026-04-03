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
    invite_id = create_response.json()["id"]

    accept_response = client.post(
        "/api/v1/tenant-invites/accept",
        json={
            "tenant_name": "Aurora Reserve Travel",
            "invite_id": invite_id,
        },
    )
    assert accept_response.status_code == 200
    invite_body = accept_response.json()["invite"]
    assert invite_body["status"] == "Accepted"
    assert invite_body["accepted_at"]

    member_response = client.get(
        "/api/v1/tenant-members",
        params={"tenant_name": "Aurora Reserve Travel"},
    )
    member_body = member_response.json()
    assert any(member["email"] == "priya@aurora.example" and member["status"] == "Active" for member in member_body["members"])
