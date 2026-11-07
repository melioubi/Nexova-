"""Tests for user CRUD endpoints."""

from tinydb import Query

from api.db import get_users_db
from tests.conftest import auth_header, login_user, register_user


# ── POST /users (register) ────────────────────────────────────────────────────


def test_register_user_success(client):
    """Happy path: register a new user returns user data without password."""
    response = client.post(
        "/users",
        json={"email": "newuser@example.com", "password": "strong-password", "name": "New User"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newuser@example.com"
    assert data["role"] == "user"
    assert data["is_active"] is True
    assert "hashed_password" not in data
    # name goes to profile, not UserPublic — verify via /auth/me
    token = login_user(client, "newuser@example.com")
    me = client.get("/auth/me", headers=auth_header(token))
    assert me.json()["profile"]["name"] == "New User"


def test_register_duplicate_email_fails(client):
    """Failure: registering with an existing email returns 409."""
    client.post("/users", json={"email": "dup@example.com", "password": "strong-password"})
    response = client.post("/users", json={"email": "dup@example.com", "password": "another-password"})
    assert response.status_code == 409
    assert "already registered" in response.text.lower()


def test_register_short_password_fails(client):
    """Failure: password shorter than 8 characters returns 422."""
    response = client.post(
        "/users",
        json={"email": "short@example.com", "password": "short"},
    )
    assert response.status_code == 422


def test_register_invalid_email_fails(client):
    """Failure: malformed email returns 422."""
    response = client.post(
        "/users",
        json={"email": "not-an-email", "password": "strong-password"},
    )
    assert response.status_code == 422


def test_register_empty_body_fails(client):
    """Failure: empty JSON body returns 422."""
    response = client.post("/users", json={})
    assert response.status_code == 422


def test_register_creates_profile(client):
    """Happy path: registration creates a profile with provided fields."""
    response = client.post(
        "/users",
        json={
            "email": "profile-create@example.com",
            "password": "strong-password",
            "name": "Profile Test",
            "phone": "555-1234",
            "address": "123 Main St",
        },
    )
    assert response.status_code == 201
    user_id = response.json()["id"]

    # Verify profile was created
    token = login_user(client, "profile-create@example.com")
    profile_resp = client.get("/profiles/me", headers=auth_header(token))
    assert profile_resp.status_code == 200
    assert profile_resp.json()["name"] == "Profile Test"
    assert profile_resp.json()["phone"] == "555-1234"
    assert profile_resp.json()["address"] == "123 Main St"


def test_register_normalizes_email(client):
    """Edge case: email is stored in lowercase."""
    response = client.post(
        "/users",
        json={"email": "UPPERCASE@Example.com", "password": "strong-password"},
    )
    assert response.status_code == 201
    assert response.json()["email"] == "uppercase@example.com"


# ── GET /users ────────────────────────────────────────────────────────────────


def test_list_users_requires_auth(client):
    """Failure: listing users without auth returns 401."""
    response = client.get("/users")
    assert response.status_code == 401


def test_list_users_returns_all_users(client):
    """Happy path: authenticated user can list all users."""
    register_user(client, "first@example.com")
    register_user(client, "second@example.com")

    admin_email = "admin@example.com"
    admin_user = register_user(client, admin_email)

    # Only admins can see all users in this implementation, but actually
    # the endpoint just calls list_users() without restrictions
    token = login_user(client, admin_email)
    response = client.get("/users", headers=auth_header(token))
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 3
    emails = [u["email"] for u in data]
    assert "first@example.com" in emails
    assert "second@example.com" in emails


# ── GET /users/{user_id} ──────────────────────────────────────────────────────


def test_read_own_user(client):
    """Happy path: user can read their own profile."""
    user = register_user(client, "own-profile@example.com")
    token = login_user(client, "own-profile@example.com")
    response = client.get(f"/users/{user['id']}", headers=auth_header(token))
    assert response.status_code == 200
    assert response.json()["email"] == "own-profile@example.com"


def test_read_another_user_fails_for_non_admin(client):
    """Failure: non-admin user cannot read another user's profile."""
    first = register_user(client, "first-user@example.com")
    second = register_user(client, "second-user@example.com")
    token = login_user(client, "first-user@example.com")

    # Can read themselves
    response = client.get(f"/users/{first['id']}", headers=auth_header(token))
    assert response.status_code == 200

    # Cannot read second user
    response = client.get(f"/users/{second['id']}", headers=auth_header(token))
    assert response.status_code == 403


def test_read_nonexistent_user_returns_404(client):
    """Failure: requesting a non-existent user ID returns 404 (as admin)."""
    # Register as admin so we can bypass the 403 check
    register_user(client, "admin-404@example.com")
    token = login_user(client, "admin-404@example.com")

    from tinydb import Query
    with get_users_db() as db:
        admin_record = db.get(Query().email == "admin-404@example.com")
        db.update({"role": "admin"}, Query().id == admin_record["id"])

    response = client.get("/users/nonexistent-id-12345", headers=auth_header(token))
    assert response.status_code == 404


# ── PUT /users/{user_id} ──────────────────────────────────────────────────────


def test_update_own_email(client):
    """Happy path: user can update their own email."""
    user = register_user(client, "old-email@example.com")
    token = login_user(client, "old-email@example.com")

    response = client.put(
        f"/users/{user['id']}",
        headers=auth_header(token),
        json={"email": "new-email@example.com"},
    )
    assert response.status_code == 200
    assert response.json()["email"] == "new-email@example.com"


def test_non_admin_cannot_change_role(client):
    """Failure: non-admin user cannot change their own role."""
    user = register_user(client, "cannot-upgrade@example.com")
    token = login_user(client, "cannot-upgrade@example.com")

    response = client.put(
        f"/users/{user['id']}",
        headers=auth_header(token),
        json={"role": "admin"},
    )
    assert response.status_code == 403


def test_admin_can_change_role(client):
    """Happy path: admin can change another user's role."""
    # Register users
    target_user = register_user(client, "target@example.com")
    register_user(client, "admin-change-role@example.com")
    admin_token = login_user(client, "admin-change-role@example.com")

    # Promote the admin user directly in DB
    from tinydb import Query
    with get_users_db() as db:
        admin_record = db.get(Query().email == "admin-change-role@example.com")
        db.update({"role": "admin"}, Query().id == admin_record["id"])

    resp = client.put(
        f"/users/{target_user['id']}",
        headers=auth_header(admin_token),
        json={"role": "manager"},
    )
    assert resp.status_code == 200
    assert resp.json()["role"] == "manager"


def test_update_to_duplicate_email_fails(client):
    """Failure: updating email to an already-registered email returns 409."""
    register_user(client, "existing@example.com")
    user2 = register_user(client, "to-change@example.com")
    token = login_user(client, "to-change@example.com")

    response = client.put(
        f"/users/{user2['id']}",
        headers=auth_header(token),
        json={"email": "existing@example.com"},
    )
    assert response.status_code == 409


def test_non_admin_cannot_update_another_user(client):
    """Failure: non-admin user cannot update another user's data."""
    register_user(client, "victim-update@example.com")
    attacker = register_user(client, "attacker-update@example.com")
    token = login_user(client, "attacker-update@example.com")

    response = client.put(
        f"/users/{attacker['id']}",  # attacker can update themselves
        headers=auth_header(token),
        json={"email": "attacker-new@example.com"},
    )
    assert response.status_code == 200  # Own update works

    # Try to update someone else
    response = client.put(
        f"/users/some-other-id",
        headers=auth_header(token),
        json={"email": "hacked@example.com"},
    )
    assert response.status_code == 403


def test_admin_update_nonexistent_user_returns_404(client):
    """Failure: admin updating a non-existent user returns 404."""
    register_user(client, "admin-upd@example.com")
    token = login_user(client, "admin-upd@example.com")

    from tinydb import Query
    with get_users_db() as db:
        record = db.get(Query().email == "admin-upd@example.com")
        db.update({"role": "admin"}, Query().id == record["id"])

    response = client.put(
        "/users/nonexistent-id",
        headers=auth_header(token),
        json={"email": "new@example.com"},
    )
    assert response.status_code == 404


# ── DELETE /users/{user_id} ───────────────────────────────────────────────────


def test_delete_own_user(client):
    """Happy path: user can delete themselves."""
    user = register_user(client, "self-delete@example.com")
    token = login_user(client, "self-delete@example.com")

    response = client.delete(f"/users/{user['id']}", headers=auth_header(token))
    assert response.status_code == 204

    # Verify user no longer exists
    login_response = client.post(
        "/auth/login",
        data={"username": "self-delete@example.com", "password": "strong-password"},
    )
    assert login_response.status_code == 401


def test_delete_nonexistent_user_fails(client):
    """Failure: deleting a non-existent user returns 404 (as admin)."""
    register_user(client, "admin-del@example.com")
    token = login_user(client, "admin-del@example.com")

    from tinydb import Query
    with get_users_db() as db:
        admin_record = db.get(Query().email == "admin-del@example.com")
        db.update({"role": "admin"}, Query().id == admin_record["id"])

    response = client.delete("/users/nonexistent-id", headers=auth_header(token))
    assert response.status_code == 404


def test_delete_another_user_fails_for_non_admin(client):
    """Failure: non-admin cannot delete another user."""
    victim = register_user(client, "victim@example.com")
    attacker = register_user(client, "attacker@example.com")
    token = login_user(client, "attacker@example.com")

    response = client.delete(f"/users/{victim['id']}", headers=auth_header(token))
    # Attacker and victim IDs don't match, and attacker is not admin → 403
    assert response.status_code == 403


def test_delete_requires_auth(client):
    """Failure: deleting without token returns 401."""
    response = client.delete("/users/some-id")
    assert response.status_code == 401