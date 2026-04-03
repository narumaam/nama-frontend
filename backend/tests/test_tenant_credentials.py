from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_tenant_credential_reset_rotates_login() -> None:
    upsert_response = client.post(
        "/api/v1/tenant-members/upsert",
        json={
            "tenant_name": "Resettable Travel",
            "member": {
                "id": "resettable-admin",
                "tenant_name": "Resettable Travel",
                "name": "Resettable Admin",
                "email": "admin@resettable.demo",
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

    request_response = client.post(
        "/api/v1/credentials/tenant/request-reset",
        json={
            "email": "admin@resettable.demo",
            "scope": "tenant",
            "tenant_name": "Resettable Travel",
        },
    )
    assert request_response.status_code == 200
    request_body = request_response.json()
    assert request_body["reset_token"]

    confirm_response = client.post(
        "/api/v1/credentials/tenant/confirm-reset",
        json={
            "email": "admin@resettable.demo",
            "scope": "tenant",
            "tenant_name": "Resettable Travel",
            "reset_token": request_body["reset_token"],
            "access_code": "Reset-pass-01",
        },
    )
    assert confirm_response.status_code == 200

    old_login = client.post(
        "/api/v1/sessions/tenant",
        json={
            "email": "admin@resettable.demo",
            "scope": "tenant",
            "tenant_name": "Resettable Travel",
            "access_code": "NAMA-RESETTAB-ADMIN",
        },
    )
    assert old_login.status_code == 401

    new_login = client.post(
        "/api/v1/sessions/tenant",
        json={
            "email": "admin@resettable.demo",
            "scope": "tenant",
            "tenant_name": "Resettable Travel",
            "access_code": "Reset-pass-01",
        },
    )
    assert new_login.status_code == 200


def test_super_admin_credential_reset_rotates_login() -> None:
    request_response = client.post(
        "/api/v1/credentials/super-admin/request-reset",
        json={
            "email": "control@nama.internal",
            "scope": "platform",
        },
    )
    assert request_response.status_code == 200
    request_body = request_response.json()

    confirm_response = client.post(
        "/api/v1/credentials/super-admin/confirm-reset",
        json={
            "email": "control@nama.internal",
            "scope": "platform",
            "reset_token": request_body["reset_token"],
            "access_code": "Nama-root-01",
        },
    )
    assert confirm_response.status_code == 200

    old_login = client.post(
        "/api/v1/sessions/super-admin",
        json={
            "email": "control@nama.internal",
            "scope": "platform",
            "access_code": "NAMA-ALPHA",
        },
    )
    assert old_login.status_code == 401

    new_login = client.post(
        "/api/v1/sessions/super-admin",
        json={
            "email": "control@nama.internal",
            "scope": "platform",
            "access_code": "Nama-root-01",
        },
    )
    assert new_login.status_code == 200

    restore_request = client.post(
        "/api/v1/credentials/super-admin/request-reset",
        json={
            "email": "control@nama.internal",
            "scope": "platform",
        },
    )
    assert restore_request.status_code == 200
    restore_token = restore_request.json()["reset_token"]

    restore_confirm = client.post(
        "/api/v1/credentials/super-admin/confirm-reset",
        json={
            "email": "control@nama.internal",
            "scope": "platform",
            "reset_token": restore_token,
            "access_code": "NAMA-ALPHA1",
        },
    )
    assert restore_confirm.status_code == 200
