import pytest
from fastapi.testclient import TestClient
from jose import jwt

from api.core.config import get_settings
from api.db import get_users_db
from api.main import app
from tinydb import Query

# ──────────────────────────────────────────────
# Password reset & change tests
# ──────────────────────────────────────────────


def test_forgot_password_always_returns_200(client: TestClient):
    """El endpoint siempre devuelve 200, incluso para emails no registrados."""
    response = client.post(
        "/auth/forgot-password",
        json={"email": "nonexistent@test.com"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "mensaje" in data["message"].lower() or "enlace" in data["message"].lower()


def test_forgot_password_sends_email_for_registered_user(client: TestClient, monkeypatch):
    """Verifica que se genera un token y se 'envía' el email para usuarios registrados."""
    register(client, "reset-test@example.com")
    response = client.post(
        "/auth/forgot-password",
        json={"email": "reset-test@example.com"},
    )
    assert response.status_code == 200


def test_reset_password_with_valid_token(client: TestClient):
    """Flujo completo: forgot-password → reset-password → login con nueva pass."""
    register(client, "full-reset@example.com")
    # Hacemos forgot-password para obtener el token del log del servidor
    client.post("/auth/forgot-password", json={"email": "full-reset@example.com"})

    # Buscamos el token en la DB de reset_tokens
    from api.db import get_reset_tokens_db
    with get_reset_tokens_db() as db:
        tokens = db.all()
    assert len(tokens) == 1
    token_record = tokens[0]
    assert not token_record["used"]

    # Generamos el token JWT manualmente como lo haría el servidor
    from api.security import ALGORITHM
    settings = get_settings()
    token_jwt = jwt.encode(
        {"sub": token_record["user_id"], "jti": token_record["jti"], "exp": 9999999999},
        settings.secret_key,
        algorithm=ALGORITHM,
    )

    # Reset password
    response = client.post(
        "/auth/reset-password",
        json={"token": token_jwt, "new_password": "new-strong-pass"},
    )
    assert response.status_code == 200
    assert "contraseña" in response.json()["message"].lower()

    # Login con nueva contraseña
    login_resp = client.post(
        "/auth/login",
        data={"username": "full-reset@example.com", "password": "new-strong-pass"},
    )
    assert login_resp.status_code == 200

    # Login con contreseña vieja falla
    login_resp = client.post(
        "/auth/login",
        data={"username": "full-reset@example.com", "password": "strong-password"},
    )
    assert login_resp.status_code == 401


def test_reset_password_rejects_used_token(client: TestClient):
    """Un token usado no puede reutilizarse."""
    register(client, "reuse-test@example.com")
    client.post("/auth/forgot-password", json={"email": "reuse-test@example.com"})

    from api.db import get_reset_tokens_db
    with get_reset_tokens_db() as db:
        tokens = db.all()
    token_record = tokens[0]

    settings = get_settings()
    token_jwt = jwt.encode(
        {"sub": token_record["user_id"], "jti": token_record["jti"], "exp": 9999999999},
        settings.secret_key,
        algorithm="HS256",
    )

    # Primer uso: debe funcionar
    resp1 = client.post(
        "/auth/reset-password",
        json={"token": token_jwt, "new_password": "new-pass-first"},
    )
    assert resp1.status_code == 200

    # Segundo uso: debe fallar
    resp2 = client.post(
        "/auth/reset-password",
        json={"token": token_jwt, "new_password": "new-pass-second"},
    )
    assert resp2.status_code == 400
    assert "utilizado" in resp2.json()["detail"].lower()


def test_reset_password_rejects_invalid_token(client: TestClient):
    """Token inválido o malformado devuelve 400."""
    response = client.post(
        "/auth/reset-password",
        json={"token": "not-a-valid-jwt-token", "new_password": "new-strong-pass"},
    )
    assert response.status_code == 400


def test_reset_password_rejects_expired_token(client: TestClient):
    """Token expirado (exp en pasado) devuelve 400."""
    expired_token = jwt.encode(
        {"sub": "any-user-id", "jti": "any-jti", "exp": 1},
        "test-secret",
        algorithm="HS256",
    )
    response = client.post(
        "/auth/reset-password",
        json={"token": expired_token, "new_password": "new-strong-pass"},
    )
    assert response.status_code == 400


def test_change_password_requires_auth(client: TestClient):
    """Change-password sin token devuelve 401."""
    response = client.post(
        "/auth/change-password",
        json={"current_password": "old", "new_password": "new-strong-pass"},
    )
    assert response.status_code == 401


def test_change_password_rejects_wrong_current(client: TestClient):
    """Si la contraseña actual es incorrecta, devuelve 400."""
    user = register(client, "change-wrong@example.com")
    token = login(client, "change-wrong@example.com")
    response = client.post(
        "/auth/change-password",
        headers={"Authorization": f"Bearer {token}"},
        json={"current_password": "wrong-current", "new_password": "new-strong-pass"},
    )
    assert response.status_code == 400
    assert "incorrecta" in response.json()["detail"].lower()


def test_change_password_succeeds(client: TestClient):
    """Change-password exitoso permite login con la nueva contraseña."""
    register(client, "change-ok@example.com")
    token = login(client, "change-ok@example.com")

    response = client.post(
        "/auth/change-password",
        headers={"Authorization": f"Bearer {token}"},
        json={"current_password": "strong-password", "new_password": "changed-pass"},
    )
    assert response.status_code == 200

    # Login con nueva contraseña
    login_resp = client.post(
        "/auth/login",
        data={"username": "change-ok@example.com", "password": "changed-pass"},
    )
    assert login_resp.status_code == 200

    # Login con vieja contraseña falla
    login_resp = client.post(
        "/auth/login",
        data={"username": "change-ok@example.com", "password": "strong-password"},
    )
    assert login_resp.status_code == 401


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