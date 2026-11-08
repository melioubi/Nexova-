"""Tests for the backend serialization audit (hito 8).

These verify the *contract* of the API responses:
- every endpoint returns a well-formed payload matching its declared schema,
- no endpoint leaks ``hashed_password`` / credentials,
- list endpoints use their own lightweight schema (no ``created_at`` on GET /users),
- the info/health endpoints declare an explicit response contract,
- registration / login / me keep the fields the frontend consumes.
"""

from tests.conftest import auth_header, login_user, register_user


# ── GET / and GET /health — explicit response model ──────────────────────────


def test_root_has_explicit_contract(client):
    """GET / returns an explicit schema (name, status, docs)."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert set(data.keys()) == {"name", "status", "docs"}
    assert data["name"] == "Nexova API"
    assert data["status"] == "ok"
    assert data["docs"] == "/docs"


def test_health_has_explicit_contract(client):
    """GET /health returns an explicit schema (status)."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert set(data.keys()) == {"status"}
    assert data["status"] == "ok"


# ── Registration / auth — no credentials leaked, frontend contract kept ──────


def test_register_response_has_no_credentials(client):
    """POST /users never leaks hashed_password in the response body."""
    response = client.post(
        "/users",
        json={"email": "no-leak@example.com", "password": "strong-password"},
    )
    assert response.status_code == 201
    data = response.json()
    assert "hashed_password" not in data
    assert "password" not in data
    # email is an echo of the caller's own input — kept for backward compatibility
    assert data["email"] == "no-leak@example.com"


def test_login_response_contains_only_token(client):
    """POST /auth/login returns only the access token (no user, no email)."""
    register_user(client, "token-only@example.com")
    response = client.post(
        "/auth/login",
        data={"username": "token-only@example.com", "password": "strong-password"},
    )
    assert response.status_code == 200
    data = response.json()
    assert set(data.keys()) == {"access_token", "token_type"}
    assert data["token_type"] == "bearer"


def test_me_response_has_no_credentials(client):
    """GET /auth/me never leaks hashed_password, keeps email for the caller."""
    register_user(client, "me-no-leak@example.com", name="Safe User")
    token = login_user(client, "me-no-leak@example.com")
    response = client.get("/auth/me", headers=auth_header(token))
    assert response.status_code == 200
    data = response.json()
    assert "hashed_password" not in data
    assert data["email"] == "me-no-leak@example.com"
    assert data["profile"]["name"] == "Safe User"


# ── User list — lightweight schema, separate from detail ─────────────────────


def test_users_list_uses_lightweight_schema(client):
    """GET /users (admin) returns only id/email/role/is_active — no created_at.

    Per the serialization guidance, the list endpoint should not reuse the
    detail schema (UserPublic) by default.
    """
    register_user(client, "list-lite@example.com")
    token = login_user(client, "list-lite@example.com")

    # Promote to admin via DB (the endpoint lists all users regardless, but
    # keep the same pattern used elsewhere in the suite).
    from tinydb import Query

    from api.db import get_users_db

    with get_users_db() as db:
        record = db.get(Query().email == "list-lite@example.com")
        db.update({"role": "admin"}, Query().id == record["id"])

    response = client.get("/users", headers=auth_header(token))
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list) and len(data) >= 1
    for user in data:
        assert set(user.keys()) == {"id", "email", "role", "is_active"}
        assert "created_at" not in user
        assert "hashed_password" not in user


def test_user_detail_keeps_created_at(client):
    """GET /users/{id} still returns the detail schema with created_at."""
    user = register_user(client, "detail-schema@example.com")
    token = login_user(client, "detail-schema@example.com")
    response = client.get(f"/users/{user['id']}", headers=auth_header(token))
    assert response.status_code == 200
    data = response.json()
    assert "created_at" in data
    assert "hashed_password" not in data