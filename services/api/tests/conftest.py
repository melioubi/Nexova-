"""Shared fixtures and helpers for Nexova API tests."""

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from jose import jwt

from api.core.config import get_settings
from api.main import app


def register_user(
    client: TestClient,
    email: str = "user@example.com",
    password: str = "strong-password",
    name: str | None = "Test User",
    phone: str | None = None,
    address: str | None = None,
) -> dict:
    """Register a user and return the JSON response body."""
    body: dict[str, object] = {"email": email, "password": password}
    if name is not None:
        body["name"] = name
    if phone is not None:
        body["phone"] = phone
    if address is not None:
        body["address"] = address
    response = client.post("/users", json=body)
    assert response.status_code == 201, f"Registration failed: {response.text}"
    return response.json()


def login_user(client: TestClient, email: str = "user@example.com", password: str = "strong-password") -> str:
    """Login and return the access token."""
    response = client.post(
        "/auth/login",
        data={"username": email, "password": password},
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["access_token"]


def auth_header(token: str) -> dict[str, str]:
    """Build an Authorization header from a bearer token."""
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def client(tmp_path, monkeypatch) -> Generator[TestClient, None, None]:
    """Create a TestClient with isolated TinyDB in a temp directory."""
    monkeypatch.setenv("SECRET_KEY", "test-secret")
    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
    monkeypatch.setenv("TINYDB_PATH", str(tmp_path / "auth"))
    get_settings.cache_clear()
    yield TestClient(app)


@pytest.fixture
def expired_token() -> str:
    """Create a token that expired in the past (unix epoch + 1 second)."""
    return jwt.encode(
        {"sub": "missing-user", "exp": 1},
        "test-secret",
        algorithm="HS256",
    )


@pytest.fixture
def invalid_token() -> str:
    """Create a malformed token (signed with wrong key)."""
    return jwt.encode(
        {"sub": "some-user", "exp": 9999999999},
        "wrong-secret",
        algorithm="HS256",
    )