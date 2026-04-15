"""
E2E Tests: Authentication (HS-1)
==================================
Tests for login, token refresh, and JWT validation.

Coverage:
  - Valid credentials → 200 with access_token
  - Invalid credentials → 401
  - Missing fields → 422
  - Token refresh → new access token
  - GET /users/me with valid token → user data
  - GET /users/me without token → 401
  - Expired token → 401
"""

import pytest
import httpx
from typing import Dict
import time
from jose import JWTError, jwt


class TestAuthLoginSuccess:
    """POST /api/v1/login with valid credentials."""

    def test_login_success(self, http_client: httpx.Client, base_url: str):
        """Valid admin credentials return 200 with access_token."""
        response = http_client.post(
            f"{base_url}/api/v1/login",
            data={
                "username": "admin@namatest.dev",
                "password": "Demo123!",
            },
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user_id"] > 0
        assert data["tenant_id"] > 0
        assert data["role"] is not None
        assert data["email"] == "admin@namatest.dev"


class TestAuthLoginFailure:
    """POST /api/v1/login with invalid/missing credentials."""

    def test_login_wrong_password(self, http_client: httpx.Client, base_url: str):
        """Wrong password returns 401."""
        response = http_client.post(
            f"{base_url}/api/v1/login",
            data={
                "username": "admin@namatest.dev",
                "password": "WrongPassword123!",
            },
        )
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data

    def test_login_missing_email(self, http_client: httpx.Client, base_url: str):
        """Missing email returns 422."""
        response = http_client.post(
            f"{base_url}/api/v1/login",
            data={
                "password": "Demo123!",
            },
        )
        assert response.status_code == 422

    def test_login_missing_password(self, http_client: httpx.Client, base_url: str):
        """Missing password returns 422."""
        response = http_client.post(
            f"{base_url}/api/v1/login",
            data={
                "username": "admin@namatest.dev",
            },
        )
        assert response.status_code == 422

    def test_login_nonexistent_user(self, http_client: httpx.Client, base_url: str):
        """Nonexistent email returns 401."""
        response = http_client.post(
            f"{base_url}/api/v1/login",
            data={
                "username": "nonexistent@namatest.dev",
                "password": "Demo123!",
            },
        )
        assert response.status_code == 401


class TestTokenRefresh:
    """POST /api/v1/refresh with valid refresh token."""

    def test_token_refresh_success(self, http_client: httpx.Client, base_url: str):
        """Valid refresh token returns new access token."""
        # Step 1: Login to get refresh token in cookie
        login_response = http_client.post(
            f"{base_url}/api/v1/login",
            data={
                "username": "admin@namatest.dev",
                "password": "Demo123!",
            },
        )
        assert login_response.status_code == 200
        old_access_token = login_response.json()["access_token"]

        # Step 2: Refresh using the cookie (automatically sent by httpx)
        refresh_response = http_client.post(f"{base_url}/api/v1/refresh")
        assert refresh_response.status_code == 200, f"Refresh failed: {refresh_response.text}"

        data = refresh_response.json()
        assert "access_token" in data
        # New access token should be different from old one
        assert data["access_token"] != old_access_token
        assert data["user_id"] > 0
        assert data["tenant_id"] > 0

    def test_token_refresh_without_cookie(self, http_client: httpx.Client, base_url: str):
        """Refresh without valid refresh token returns 401."""
        # Create a new client without cookies
        fresh_client = httpx.Client(follow_redirects=True, timeout=30.0)
        try:
            response = fresh_client.post(f"{base_url}/api/v1/refresh")
            assert response.status_code == 401
        finally:
            fresh_client.close()


class TestUsersMeEndpoint:
    """GET /api/v1/users/me — current user profile."""

    def test_me_authenticated(self, http_client: httpx.Client, base_url: str, auth_headers: Dict[str, str]):
        """GET /users/me with valid token returns current user."""
        response = http_client.get(
            f"{base_url}/api/v1/users/me",
            headers=auth_headers,
        )
        assert response.status_code == 200, f"Failed to get /users/me: {response.text}"
        data = response.json()
        assert data["email"] == "admin@namatest.dev"
        assert data["id"] > 0
        assert data["tenant_id"] > 0
        assert "full_name" in data

    def test_me_unauthenticated(self, http_client: httpx.Client, base_url: str):
        """GET /users/me without token returns 401."""
        response = http_client.get(f"{base_url}/api/v1/users/me")
        assert response.status_code == 401

    def test_me_invalid_token(self, http_client: httpx.Client, base_url: str):
        """GET /users/me with invalid token returns 401."""
        response = http_client.get(
            f"{base_url}/api/v1/users/me",
            headers={"Authorization": "Bearer invalid-token-xyz"},
        )
        assert response.status_code == 401

    def test_me_missing_bearer_prefix(self, http_client: httpx.Client, base_url: str, auth_tokens: Dict[str, str]):
        """GET /users/me with token but no 'Bearer ' prefix returns 401."""
        response = http_client.get(
            f"{base_url}/api/v1/users/me",
            headers={"Authorization": auth_tokens["access"]},  # Missing "Bearer "
        )
        assert response.status_code == 401


class TestExpiredToken:
    """Manually crafted expired JWT token."""

    def test_expired_token_rejected(self, http_client: httpx.Client, base_url: str):
        """
        Manually create an expired JWT token.
        Expect 401 when used in Authorization header.

        Note: This test requires knowledge of the SECRET_KEY.
        If the server uses a different key, this test may fail.
        """
        SECRET_KEY = "test-secret-key-32-chars-minimum!!"

        # Create an expired token (exp in the past)
        expired_payload = {
            "user_id": 1,
            "tenant_id": 1,
            "role": "R2_ORG_ADMIN",
            "email": "admin@namatest.dev",
            "exp": int(time.time()) - 3600,  # Expired 1 hour ago
        }

        expired_token = jwt.encode(
            expired_payload,
            SECRET_KEY,
            algorithm="HS256",
        )

        response = http_client.get(
            f"{base_url}/api/v1/users/me",
            headers={"Authorization": f"Bearer {expired_token}"},
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
