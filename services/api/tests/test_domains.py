"""Tests for domain endpoints (candidates, clients, vacancies, etc.)."""

from tests.conftest import auth_header, login_user, register_user


# ── Authentication requirement (all domains) ──────────────────────────────────


DOMAINS = ["candidates", "clients", "vacancies", "interviews", "evaluations"]


def test_all_domains_require_auth_for_list(client):
    """Failure: listing any domain without a token returns 401."""
    for path in DOMAINS:
        response = client.get(f"/{path}")
        assert response.status_code == 401, f"GET /{path} should require auth"


def test_all_domains_require_auth_for_create(client):
    """Failure: creating in any domain without a token returns 401."""
    for path in DOMAINS:
        response = client.post(f"/{path}", json={"title": "Sensitive"})
        assert response.status_code == 401, f"POST /{path} should require auth"


# ── Domain record CRUD ────────────────────────────────────────────────────────


def test_create_domain_record(client):
    """Happy path: authenticated user can create a domain record."""
    email = "domain-user@example.com"
    register_user(client, email)
    token = login_user(client, email)
    headers = auth_header(token)

    for path in DOMAINS:
        response = client.post(
            f"/{path}",
            headers=headers,
            json={"title": f"New {path} record", "details": {"key": "value"}},
        )
        assert response.status_code == 201, f"POST /{path} failed: {response.text}"
        data = response.json()
        assert data["title"] == f"New {path} record"
        assert data["details"] == {"key": "value"}
        assert "id" in data
        assert "user_uuid" in data
        assert data["user_uuid"] is not None


def test_list_domain_records(client):
    """Happy path: authenticated user can list their domain records."""
    email = "list-domain@example.com"
    register_user(client, email)
    token = login_user(client, email)
    headers = auth_header(token)

    # Create two records
    for i in range(2):
        client.post(
            "/candidates",
            headers=headers,
            json={"title": f"Candidate {i}"},
        )

    response = client.get("/candidates", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 2


def test_domain_records_are_scoped_to_user(client):
    """Edge case: users only see their own domain records."""
    # User A creates a record
    register_user(client, "usera@example.com")
    token_a = login_user(client, "usera@example.com")
    client.post("/candidates", headers=auth_header(token_a), json={"title": "User A record"})

    # User B creates a record
    register_user(client, "userb@example.com")
    token_b = login_user(client, "userb@example.com")
    client.post("/candidates", headers=auth_header(token_b), json={"title": "User B record"})

    # User A should only see their own record
    response_a = client.get("/candidates", headers=auth_header(token_a))
    titles_a = [r["title"] for r in response_a.json()]
    assert "User A record" in titles_a
    assert "User B record" not in titles_a


def test_create_domain_record_empty_title_fails(client):
    """Failure: creating a domain record with empty title returns 422."""
    email = "empty-title@example.com"
    register_user(client, email)
    token = login_user(client, email)

    for path in DOMAINS:
        response = client.post(
            f"/{path}",
            headers=auth_header(token),
            json={"title": ""},
        )
        assert response.status_code == 422, f"POST /{path} with empty title should be 422"


def test_domains_return_empty_list_when_no_records(client):
    """Edge case: domain with no records returns empty list (not 404)."""
    email = "no-records@example.com"
    register_user(client, email)
    token = login_user(client, email)

    for path in DOMAINS:
        response = client.get(f"/{path}", headers=auth_header(token))
        assert response.status_code == 200
        assert response.json() == []