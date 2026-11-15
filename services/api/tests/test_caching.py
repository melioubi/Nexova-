"""Tests for the response cache on inventory reads (CACHING_REPORT.md)."""

import threading
import time

import pytest

from api import db as db_module
from api.core.cache import TTLCache, cache
from tests.conftest import auth_header, login_user, register_user


# ---------------------------------------------------------------------------
# TTLCache unit tests
# ---------------------------------------------------------------------------

class FakeClock:
    def __init__(self) -> None:
        self.now = 0.0

    def __call__(self) -> float:
        return self.now


def test_hit_after_miss_and_expiry_by_ttl():
    clock = FakeClock()
    c = TTLCache(clock=clock)
    calls = []
    loader = lambda: calls.append(1) or len(calls)  # noqa: E731

    assert c.get_or_set("ns", "k", 10, loader) == (1, False)
    assert c.get_or_set("ns", "k", 10, loader) == (1, True)
    clock.now = 10.01
    assert c.get_or_set("ns", "k", 10, loader) == (2, False)


def test_ttl_is_mandatory():
    with pytest.raises(ValueError):
        TTLCache().get_or_set("ns", "k", 0, lambda: 1)


def test_invalidate_only_affects_its_namespace():
    c = TTLCache()
    c.get_or_set("a", "k", 60, lambda: "a1")
    c.get_or_set("b", "k", 60, lambda: "b1")
    c.invalidate("a")
    assert c.get_or_set("a", "k", 60, lambda: "a2") == ("a2", False)
    assert c.get_or_set("b", "k", 60, lambda: "b2") == ("b1", True)


def test_read_started_before_invalidation_is_not_stored():
    """A slow read that overlaps a write must not repopulate the cache with
    pre-write data."""
    c = TTLCache()

    def slow_loader():
        c.invalidate("ns")  # a write commits while we are still loading
        return "old"

    assert c.get_or_set("ns", "k", 60, slow_loader) == ("old", False)
    assert c.get_or_set("ns", "k", 60, lambda: "new") == ("new", False)


def test_concurrent_misses_call_loader_once():
    c = TTLCache()
    calls = []

    def loader():
        calls.append(1)
        time.sleep(0.05)
        return "v"

    threads = [threading.Thread(target=c.get_or_set, args=("ns", "k", 60, loader)) for _ in range(8)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert len(calls) == 1


def test_bounded_number_of_entries():
    c = TTLCache(max_entries=2)
    for key in "abc":
        c.get_or_set("ns", key, 60, lambda: key)
    assert c.stats()["entries"] == 2
    assert c.get_or_set("ns", "a", 60, lambda: "again") == ("again", False)


# ---------------------------------------------------------------------------
# Inventory endpoints
# ---------------------------------------------------------------------------

@pytest.fixture
def inventory_client(client, tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path / 'inventory.db'}")
    from api.core.config import get_settings

    get_settings.cache_clear()
    monkeypatch.setattr(db_module, "_engine", None)
    db_module.init_db()
    cache.clear()
    cache.enabled = True
    yield client
    cache.clear()


@pytest.fixture
def headers(inventory_client):
    register_user(inventory_client)
    return auth_header(login_user(inventory_client))


def _create_asset(client, headers, name="Data Engineer Senior"):
    response = client.post(
        "/inventory/products",
        json={"name": name, "skill_category": "Data", "country": "Chile"},
        headers=headers,
    )
    assert response.status_code == 201
    return response.json()["id"]


def test_products_second_read_is_a_hit(inventory_client, headers):
    _create_asset(inventory_client, headers)
    first = inventory_client.get("/inventory/products", headers=headers)
    second = inventory_client.get("/inventory/products", headers=headers)
    assert first.headers["X-Cache"] == "MISS"
    assert second.headers["X-Cache"] == "HIT"
    assert first.json() == second.json()


def test_cached_body_keeps_the_response_contract(inventory_client, headers):
    asset_id = _create_asset(inventory_client, headers)
    inventory_client.post("/inventory/orders/inbound", json={"talent_asset_id": asset_id, "quantity": 3}, headers=headers)
    products = inventory_client.get("/inventory/products", headers=headers).json()
    orders = inventory_client.get("/inventory/orders", headers=headers).json()
    assert set(products[0]) == {"id", "name", "skill_category", "country", "description", "current_stock"}
    assert products[0]["current_stock"] == 3
    assert set(orders[0]) >= {"id", "type", "talent_asset_name", "quantity", "created_at", "user_uuid"}


def test_inbound_order_invalidates_products_and_orders(inventory_client, headers):
    asset_id = _create_asset(inventory_client, headers)
    inventory_client.get("/inventory/products", headers=headers)
    inventory_client.get("/inventory/orders", headers=headers)

    inventory_client.post("/inventory/orders/inbound", json={"talent_asset_id": asset_id, "quantity": 5}, headers=headers)

    products = inventory_client.get("/inventory/products", headers=headers)
    orders = inventory_client.get("/inventory/orders", headers=headers)
    assert products.headers["X-Cache"] == "MISS"
    assert products.json()[0]["current_stock"] == 5
    assert orders.headers["X-Cache"] == "MISS"
    assert len(orders.json()) == 1


def test_outbound_order_invalidates_and_rejected_one_does_not(inventory_client, headers):
    asset_id = _create_asset(inventory_client, headers)
    inventory_client.post("/inventory/orders/inbound", json={"talent_asset_id": asset_id, "quantity": 5}, headers=headers)
    inventory_client.get("/inventory/products", headers=headers)

    rejected = inventory_client.post("/inventory/orders/outbound", json={"talent_asset_id": asset_id, "quantity": 99}, headers=headers)
    assert rejected.status_code == 400
    assert inventory_client.get("/inventory/products", headers=headers).headers["X-Cache"] == "HIT"

    inventory_client.post("/inventory/orders/outbound", json={"talent_asset_id": asset_id, "quantity": 2}, headers=headers)
    after = inventory_client.get("/inventory/products", headers=headers)
    assert after.headers["X-Cache"] == "MISS"
    assert after.json()[0]["current_stock"] == 3


def test_new_product_invalidates_product_list(inventory_client, headers):
    _create_asset(inventory_client, headers, "A")
    inventory_client.get("/inventory/products", headers=headers)
    _create_asset(inventory_client, headers, "B")
    response = inventory_client.get("/inventory/products", headers=headers)
    assert response.headers["X-Cache"] == "MISS"
    assert len(response.json()) == 2


def test_outbound_guard_ignores_cache(inventory_client, headers):
    """Stock check for outbound orders must read the DB, not the cached list."""
    asset_id = _create_asset(inventory_client, headers)
    inventory_client.post("/inventory/orders/inbound", json={"talent_asset_id": asset_id, "quantity": 2}, headers=headers)
    inventory_client.get("/inventory/products", headers=headers)  # cache: stock 2
    # A write that bypasses the API (no invalidation): stock in DB becomes 0.
    from sqlmodel import Session
    from api.inventory.models import TalentExit

    with Session(db_module._get_engine()) as s:
        s.add(TalentExit(talent_asset_id=asset_id, quantity=2, user_uuid="manual"))
        s.commit()
    response = inventory_client.post("/inventory/orders/outbound", json={"talent_asset_id": asset_id, "quantity": 1}, headers=headers)
    assert response.status_code == 400


def test_cache_is_behind_authentication(inventory_client, headers):
    _create_asset(inventory_client, headers)
    inventory_client.get("/inventory/products", headers=headers)  # warm cache
    assert inventory_client.get("/inventory/products").status_code == 401
    assert inventory_client.get("/inventory/orders").status_code == 401


def test_disabled_cache_bypasses(inventory_client, headers):
    cache.enabled = False
    _create_asset(inventory_client, headers)
    inventory_client.get("/inventory/products", headers=headers)
    assert inventory_client.get("/inventory/products", headers=headers).headers["X-Cache"] == "BYPASS"
