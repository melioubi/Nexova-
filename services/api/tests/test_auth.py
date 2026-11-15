"""Tests for authentication endpoints: login, /me, and security functions."""

import pytest
from jose import JWTError, jwt

from api.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from tests.conftest import auth_header, login_user, register_user


# ── POST /auth/login ─────────────────────────────────────────────────────────


def test_login_with_valid_credentials(client):
    """Happy path: login with correct email and password returns a token."""
    email = "valid@example.com"
    register_user(client, email)
    token = login_user(client, email)
    assert isinstance(token, str) and len(token) > 0


def test_login_normalizes_email_case(client):
    """Edge case: email casing differs from registration but should match."""
    register_user(client, "CaseMIX@example.com")
    token = login_user(client, "casemix@example.com")
    assert isinstance(token, str) and len(token) > 0


def test_login_with_extra_form_fields(client):
    """Edge case: OAuth2 form includes extra fields (should be ignored)."""
    register_user(client, "extra@example.com")
    response = client.post(
        "/auth/login",
        data={"username": "extra@example.com", "password": "strong-password", "name": "extra"},
    )
    assert response.status_code == 200


def test_login_wrong_password_fails(client):
    """Failure: wrong password returns 401."""
    register_user(client, "wrongpass@example.com")
    response = client.post(
        "/auth/login",
        data={"username": "wrongpass@example.com", "password": "wrong-password"},
    )
    assert response.status_code == 401
    assert "Incorrect email or password" in response.text


def test_login_nonexistent_email_fails(client):
    """Failure: unregistered email returns 401."""
    response = client.post(
        "/auth/login",
        data={"username": "nobody@example.com", "password": "some-password"},
    )
    assert response.status_code == 401


def test_login_empty_password_fails(client):
    """Failure: empty password field returns 422 validation error."""
    register_user(client, "emptypass@example.com")
    response = client.post(
        "/auth/login",
        data={"username": "emptypass@example.com", "password": ""},
    )
    assert response.status_code == 422


def test_login_empty_username_fails(client):
    """Failure: empty username returns 422."""
    response = client.post(
        "/auth/login",
        data={"username": "", "password": "some-password"},
    )
    assert response.status_code == 422


def test_login_inactive_user_fails(client):
    """Failure: inactive user trying to login returns 403."""
    from tinydb import Query
    from api.db import get_users_db

    register_user(client, "inactive@example.com")
    # Deactivate the user manually
    with get_users_db() as db:
        record = db.get(Query().email == "inactive@example.com")
        db.update({"is_active": False}, Query().id == record["id"])

    response = client.post(
        "/auth/login",
        data={"username": "inactive@example.com", "password": "strong-password"},
    )
    assert response.status_code == 403
    assert "Inactive user" in response.text


# ── GET /auth/me ─────────────────────────────────────────────────────────────


def test_me_returns_current_user(client):
    """Happy path: valid token returns the authenticated user's info."""
    email = "me@example.com"
    user = register_user(client, email, name="Me User")
    token = login_user(client, email)

    response = client.get("/auth/me", headers=auth_header(token))
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == email
    assert data["id"] == user["id"]
    assert data["role"] == "user"
    assert data["is_active"] is True


def test_me_includes_profile_when_exists(client):
    """Happy path: /auth/me includes the user's profile."""
    email = "profile@example.com"
    register_user(client, email, name="Profile User", phone="555-0100")
    token = login_user(client, email)

    response = client.get("/auth/me", headers=auth_header(token))
    assert response.status_code == 200
    data = response.json()
    assert data["profile"] is not None
    assert data["profile"]["name"] == "Profile User"
    assert data["profile"]["phone"] == "555-0100"


def test_me_without_token_fails(client):
    """Failure: no token returns 401."""
    response = client.get("/auth/me")
    assert response.status_code == 401


def test_me_with_invalid_token_fails(client, invalid_token):
    """Failure: malformed token (wrong secret) returns 401."""
    response = client.get("/auth/me", headers=auth_header(invalid_token))
    assert response.status_code == 401


def test_me_with_expired_token_fails(client, expired_token):
    """Failure: expired token returns 401."""
    response = client.get("/auth/me", headers=auth_header(expired_token))
    assert response.status_code == 401


def test_me_with_empty_sub_token_fails(client):
    """Failure: token with empty subject (sub='') returns 401."""
    empty_sub_token = jwt.encode(
        {"sub": "", "exp": 9999999999},
        "test-secret",
        algorithm="HS256",
    )
    response = client.get("/auth/me", headers=auth_header(empty_sub_token))
    assert response.status_code == 401


def test_me_with_nonexistent_user_fails(client):
    """Failure: valid token but user doesn't exist returns 401."""
    missing_token = jwt.encode(
        {"sub": "nonexistent-id", "exp": 9999999999},
        "test-secret",
        algorithm="HS256",
    )
    response = client.get("/auth/me", headers=auth_header(missing_token))
    assert response.status_code == 401


def test_me_after_user_deleted_fails(client):
    """Failure: user deleted after token issued returns 401."""
    user = register_user(client, "delete-me@example.com")
    token = login_user(client, "delete-me@example.com")

    response = client.delete(f"/users/{user['id']}", headers=auth_header(token))
    assert response.status_code == 204

    response = client.get("/auth/me", headers=auth_header(token))
    assert response.status_code == 401


# ── Pure unit tests (business logic, no HTTP) ────────────────────────────────


class TestSecurityFunctions:
    """Test security functions directly — no HTTP serialization."""

    def test_password_hashing_produces_bcrypt_hash(self):
        """Business logic: hash_password produces a bcrypt hash, verify_password matches."""
        password = "my-secure-password"
        hashed = hash_password(password)
        assert hashed.startswith("$2"), "Should be a bcrypt hash"
        assert verify_password(password, hashed) is True

    def test_verify_wrong_password_fails(self):
        """Business logic: wrong password doesn't match the hash."""
        hashed = hash_password("correct-password")
        assert verify_password("wrong-password", hashed) is False

    def test_create_access_token_returns_valid_jwt(self):
        """Business logic: create_access_token returns a 3-part JWT string."""
        token = create_access_token("user-123")
        assert isinstance(token, str)
        assert token.count(".") == 2, "JWT must have 3 parts separated by dots"

    def test_decode_valid_token_returns_user_id(self):
        """Business logic: decode_access_token returns the correct user_id."""
        user_id = "user-123"
        token = create_access_token(user_id)
        decoded = decode_access_token(token)
        assert decoded == user_id

    def test_decode_expired_token_raises_jwt_error(self):
        """Business logic: expired token raises JWTError."""
        token = jwt.encode(
            {"sub": "user-123", "exp": 1},
            "test-secret",
            algorithm="HS256",
        )
        with pytest.raises(JWTError):
            decode_access_token(token)

    def test_decode_token_missing_sub_raises_jwt_error(self):
        """Business logic: token without sub raises JWTError."""
        token = jwt.encode(
            {"exp": 9999999999},
            "test-secret",
            algorithm="HS256",
        )
        with pytest.raises(JWTError):
            decode_access_token(token)

    def test_decode_token_empty_sub_raises_jwt_error(self):
        """Business logic: token with empty sub raises JWTError."""
        token = jwt.encode(
            {"sub": "", "exp": 9999999999},
            "test-secret",
            algorithm="HS256",
        )
        with pytest.raises(JWTError):
            decode_access_token(token)