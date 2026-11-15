"""Tests for profile endpoints."""

from tinydb import Query

from api.db import get_profiles_db
from tests.conftest import auth_header, login_user, register_user


# ── GET /profiles/me ──────────────────────────────────────────────────────────


def test_read_own_profile(client):
    """Happy path: authenticated user can read their own profile."""
    register_user(client, "profile-me@example.com", name="Profile Me", phone="555-0001")
    token = login_user(client, "profile-me@example.com")

    response = client.get("/profiles/me", headers=auth_header(token))
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Profile Me"
    assert data["phone"] == "555-0001"


def test_read_profile_without_auth_fails(client):
    """Failure: reading profile without token returns 401."""
    response = client.get("/profiles/me")
    assert response.status_code == 401


def test_read_profile_when_deleted_returns_404(client):
    """Failure: user whose profile was deleted gets 404."""
    register_user(client, "no-profile@example.com")
    token = login_user(client, "no-profile@example.com")

    # Delete all profiles to simulate missing profile
    with get_profiles_db() as db:
        db.truncate()

    response = client.get("/profiles/me", headers=auth_header(token))
    assert response.status_code == 404


# ── PUT /profiles/me ──────────────────────────────────────────────────────────


def test_update_profile_successfully(client):
    """Happy path: authenticated user can update their profile."""
    register_user(client, "update-profile@example.com", name="Old Name")
    token = login_user(client, "update-profile@example.com")

    response = client.put(
        "/profiles/me",
        headers=auth_header(token),
        json={"name": "Updated Name", "phone": "555-0200", "address": "New Address"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Name"
    assert data["phone"] == "555-0200"
    assert data["address"] == "New Address"


def test_update_profile_partially(client):
    """Edge case: updating only some fields preserves others."""
    register_user(client, "partial@example.com", name="Full Name", phone="555-0300", address="Old Address")
    token = login_user(client, "partial@example.com")

    # Update only phone
    response = client.put(
        "/profiles/me",
        headers=auth_header(token),
        json={"phone": "555-9999"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Full Name"  # Preserved
    assert data["phone"] == "555-9999"  # Updated
    assert data["address"] == "Old Address"  # Preserved


def test_update_profile_creates_if_missing(client):
    """Edge case: updating profile when none exists creates one."""
    register_user(client, "no-profile@example.com")
    token = login_user(client, "no-profile@example.com")

    # Delete the profile
    with get_profiles_db() as db:
        db.truncate()

    response = client.put(
        "/profiles/me",
        headers=auth_header(token),
        json={"name": "Created Profile"},
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Created Profile"


def test_update_profile_without_auth_fails(client):
    """Failure: updating profile without token returns 401."""
    response = client.put("/profiles/me", json={"name": "Hacker"})
    assert response.status_code == 401