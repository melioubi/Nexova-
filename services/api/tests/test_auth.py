import pytest
from fastapi.testclient import TestClient
from jose import jwt

from api.core.config import get_settings
from api.db import get_users_db
from api.main import app


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "test-secret")
    monkeypatch.setenv("TINYDB_PATH", str(tmp_path / "auth"))
    get_settings.cache_clear()
    return TestClient(app)


def register(client: TestClient, email: str, name: str = "Test User") -> dict:
    response = client.post(
        "/users",
        json={"email": email, "password": "strong-password", "name": name},
    )
    assert response.status_code == 201, response.text
    return response.json()


def login(client: TestClient, email: str) -> str:
    response = client.post(
        "/auth/login",
        data={"username": email, "password": "strong-password"},
    )
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def test_protected_routes_require_a_token(client: TestClient):
    assert client.get("/users").status_code == 401
    assert client.get("/auth/me").status_code == 401
    assert client.get("/profiles/me").status_code == 401
    assert client.get("/auth/me", headers={"Authorization": "Bearer invalid"}).status_code == 401


def test_registration_login_and_profile(client: TestClient):
    user = register(client, "user@example.com", "Test User")
    assert user["role"] == "user"
    assert "hashed_password" not in user

    token = login(client, "user@example.com")
    response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    assert response.json()["email"] == "user@example.com"
    assert response.json()["profile"]["name"] == "Test User"
    with get_users_db() as db:
        stored_user = db.all()[0]
    assert stored_user["hashed_password"] != "strong-password"
    assert stored_user["hashed_password"].startswith("$2")


def test_profile_owner_can_update_profile(client: TestClient):
    register(client, "profile@example.com", "Initial Name")
    token = login(client, "profile@example.com")

    response = client.put(
        "/profiles/me",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Updated Name", "phone": "555-0100", "address": "Main St"},
    )

    assert response.status_code == 200
    assert response.json()["name"] == "Updated Name"
    assert response.json()["phone"] == "555-0100"


def test_invalid_role_is_rejected(client: TestClient):
    user = register(client, "invalid-role@example.com")
    token = login(client, "invalid-role@example.com")
    response = client.put(
        f"/users/{user['id']}",
        headers={"Authorization": f"Bearer {token}"},
        json={"role": "owner"},
    )

    assert response.status_code == 422


def test_user_cannot_access_another_user(client: TestClient):
    first = register(client, "first@example.com")
    second = register(client, "second@example.com")
    token = login(client, "first@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    assert client.get(f"/users/{second['id']}", headers=headers).status_code == 403
    assert client.put(
        f"/users/{second['id']}",
        headers=headers,
        json={"email": "changed@example.com"},
    ).status_code == 403


def test_invalid_credentials_are_rejected(client: TestClient):
    register(client, "user@example.com")
    response = client.post(
        "/auth/login",
        data={"username": "user@example.com", "password": "wrong-password"},
    )
    assert response.status_code == 401


def test_expired_token_is_rejected(client: TestClient):
    register(client, "expired@example.com")
    expired_token = jwt.encode(
        {"sub": "missing-user", "exp": 1},
        "test-secret",
        algorithm="HS256",
    )
    response = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert response.status_code == 401


def test_all_sensitive_domains_require_authentication(client: TestClient):
    for path in ("candidates", "clients", "vacancies", "interviews", "evaluations"):
        assert client.get(f"/{path}").status_code == 401
        assert client.post(f"/{path}", json={"title": "Sensitive"}).status_code == 401