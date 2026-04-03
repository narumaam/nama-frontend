from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_tenant_sessions_health() -> None:
    response = client.get("/api/v1/sessions/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ready", "module": "TENANT_SESSIONS"}


def test_issue_tenant_session() -> None:
    response = client.post(
        "/api/v1/sessions/tenant",
        json={
            "email": "sales@aurora.example",
            "display_name": "Sales Lead",
            "role": "sales",
            "scope": "tenant",
            "tenant_name": "Aurora Reserve Travel",
            "member_id": "aurora-sales-1",
            "member_status": "Active",
            "designation": "Travel Consultant",
            "team": "Sales Desk",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["role"] == "sales"
    assert body["scope"] == "tenant"
    assert body["tenant_name"] == "Aurora Reserve Travel"
    assert body["member_id"] == "aurora-sales-1"


def test_issue_super_admin_session() -> None:
    response = client.post(
        "/api/v1/sessions/super-admin",
        json={
            "email": "control@nama.internal",
            "display_name": "NAMA Super Admin",
            "role": "super-admin",
            "scope": "platform",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["role"] == "super-admin"
    assert body["scope"] == "platform"
    assert body["tenant_name"] is None


def test_issue_tenant_session_with_credentials() -> None:
    response = client.post(
        "/api/v1/sessions/tenant",
        json={
            "email": "sales@aurorareservetravel.demo",
            "scope": "tenant",
            "tenant_name": "Aurora Reserve Travel",
            "access_code": "NAMA-AURORARE-SALES",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["email"] == "sales@aurorareservetravel.demo"
    assert body["role"] == "sales"
    assert body["member_status"] == "Active"


def test_issue_super_admin_session_with_credentials() -> None:
    response = client.post(
        "/api/v1/sessions/super-admin",
        json={
            "email": "control@nama.internal",
            "scope": "platform",
            "access_code": "NAMA-ALPHA",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["display_name"] == "NAMA Super Admin"
    assert body["role"] == "super-admin"


def test_issue_upserted_tenant_member_session_with_credentials() -> None:
    upsert_response = client.post(
        "/api/v1/tenant-members/upsert",
        json={
            "tenant_name": "Beta Role Labs",
            "member": {
                "id": "beta-role-labs-admin",
                "tenant_name": "Beta Role Labs",
                "name": "Radhika Beta",
                "email": "radhika.beta@betarolelabs.demo",
                "role": "customer-admin",
                "designation": "Workspace Admin",
                "team": "Leadership",
                "status": "Active",
                "source": "tenant-profile",
                "reports_to": "Platform",
                "responsibility": "Workspace ownership",
            },
        },
    )
    assert upsert_response.status_code == 200

    response = client.post(
        "/api/v1/sessions/tenant",
        json={
            "email": "radhika.beta@betarolelabs.demo",
            "scope": "tenant",
            "tenant_name": "Beta Role Labs",
            "access_code": "NAMA-BETAROLE-ADMIN",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["email"] == "radhika.beta@betarolelabs.demo"
    assert body["role"] == "customer-admin"
