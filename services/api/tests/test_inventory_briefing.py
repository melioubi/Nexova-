"""Inventory aligned with nexova-BRIEFING.es.md (telemetry-plan.md §3)."""

import json

import pytest
from sqlalchemy import create_engine, inspect, text

from api import db as db_module
from api.core.cache import cache
from tests.conftest import auth_header, login_user, register_user


@pytest.fixture
def api(client, tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path / 'inventory.db'}")
    from api.core.config import get_settings

    get_settings.cache_clear()
    monkeypatch.setattr(db_module, "_engine", None)
    db_module.init_db()
    cache.clear()
    register_user(client)
    client.headers.update(auth_header(login_user(client)))
    yield client
    cache.clear()


def product(api, **overrides):
    body = {"name": "Kit de certificación en ventas B2B", "office": "valencia", "product_category": "certification",
            "programme_id": "ventas-b2b", "min_stock": 5, **overrides}
    response = api.post("/inventory/products", json=body)
    assert response.status_code == 201, response.text
    return response.json()


def inbound(api, pid, quantity=10, unit_cost=18.5, supplier_id="sup-1"):
    return api.post("/inventory/orders/inbound",
                    json={"talent_asset_id": pid, "quantity": quantity, "unit_cost": unit_cost, "supplier_id": supplier_id})


def outbound(api, pid, quantity, recipient_type="client"):
    return api.post("/inventory/orders/outbound",
                    json={"talent_asset_id": pid, "quantity": quantity, "recipient_type": recipient_type})


# -- products ---------------------------------------------------------------

@pytest.mark.parametrize("office,currency", [("valencia", "EUR"), ("miami", "USD")])
def test_currency_is_derived_from_office(api, office, currency):
    assert product(api, office=office)["currency"] == currency


@pytest.mark.parametrize("bad", [{"office": "chile"}, {"product_category": "book"}, {"programme_id": "Ventas B2B"}])
def test_product_dimensions_are_closed_sets(api, bad):
    body = {"name": "x", **bad}
    assert api.post("/inventory/products", json=body).status_code == 422


@pytest.mark.parametrize("key", ["current_stock", "stock", "quantity"])
def test_stock_cannot_be_set_in_product_payload(api, key):
    assert api.post("/inventory/products", json={"name": "x", key: 30}).status_code == 422


@pytest.mark.parametrize("method", ["put", "patch", "delete"])
def test_direct_stock_edit_is_rejected_with_405(api, method):
    pid = product(api)["id"]
    response = getattr(api, method)(f"/inventory/products/{pid}/stock")
    assert response.status_code == 405
    assert "orden" in response.json()["detail"]


def test_direct_stock_edit_on_unknown_product_is_404(api):
    assert api.patch("/inventory/products/00000000-0000-4000-8000-000000000000/stock").status_code == 404


def test_direct_stock_edit_requires_auth(client, api):
    pid = product(api)["id"]
    client.headers.pop("Authorization")
    assert client.patch(f"/inventory/products/{pid}/stock").status_code == 401


# -- inbound orders -----------------------------------------------------------

def test_inbound_requires_unit_cost_and_supplier(api):
    pid = product(api)["id"]
    response = api.post("/inventory/orders/inbound", json={"talent_asset_id": pid, "quantity": 3})
    assert response.status_code == 422
    assert {e["loc"][-1] for e in response.json()["detail"]} == {"unit_cost", "supplier_id"}


def test_inbound_on_unknown_product_is_404(api):
    assert inbound(api, "00000000-0000-4000-8000-000000000000").status_code == 404


def test_inbound_returns_stock_after(api):
    pid = product(api)["id"]
    inbound(api, pid, quantity=7)
    assert inbound(api, pid, quantity=3).json()["stock_after"] == 10


def test_cost_variance_needs_three_orders_of_history(api):
    pid = product(api)["id"]
    inbound(api, pid, unit_cost=18.0)
    inbound(api, pid, unit_cost=18.0)
    assert inbound(api, pid, unit_cost=40.0).json()["cost_variance"] is None  # only 2 in history


def test_cost_variance_detected_against_same_supplier(api):
    pid = product(api)["id"]
    for cost in (18.4, 18.6, 18.5, 18.7, 18.8):
        inbound(api, pid, unit_cost=cost, supplier_id="imprenta")
    inbound(api, pid, unit_cost=99.0, supplier_id="otra-imprenta")  # other supplier: not in the baseline
    variance = inbound(api, pid, unit_cost=21.4, supplier_id="imprenta").json()["cost_variance"]
    assert variance == {"baseline_unit_cost": 18.6, "variance_pct": 15.05, "direction": "increase",
                        "threshold_pct": 10.0, "baseline_sample_size": 5}


def test_cost_within_threshold_is_not_a_variance(api):
    pid = product(api)["id"]
    for cost in (20, 20, 20):
        inbound(api, pid, unit_cost=cost)
    assert inbound(api, pid, unit_cost=21.9).json()["cost_variance"] is None  # +9.5 %


def test_cost_decrease_is_reported(api):
    pid = product(api)["id"]
    for cost in (20, 20, 20):
        inbound(api, pid, unit_cost=cost)
    assert inbound(api, pid, unit_cost=15).json()["cost_variance"]["direction"] == "decrease"


# -- outbound orders ----------------------------------------------------------

def test_outbound_requires_recipient_type(api):
    pid = product(api)["id"]
    inbound(api, pid)
    response = api.post("/inventory/orders/outbound", json={"talent_asset_id": pid, "quantity": 1})
    assert response.status_code == 422


def test_threshold_triggers_only_on_crossing(api):
    pid = product(api, min_stock=5)["id"]
    inbound(api, pid, quantity=7)
    first = outbound(api, pid, 1).json()        # 7 → 6: still >= 5
    crossing = outbound(api, pid, 2).json()     # 6 → 4: crosses
    below = outbound(api, pid, 1).json()        # 4 → 3: already below, no new trigger
    assert (first["threshold_triggered"], crossing["threshold_triggered"], below["threshold_triggered"]) == (False, True, False)
    assert (crossing["stock_before"], crossing["stock_after"], crossing["min_stock"]) == (6, 4, 5)


def test_orders_list_has_briefing_dimensions(api):
    pid = product(api, office="miami", programme_id="soporte-onboarding")["id"]
    inbound(api, pid)
    [order] = api.get("/inventory/orders").json()
    assert (order["office"], order["programme_id"], order["product_category"]) == ("miami", "soporte-onboarding", "certification")


# -- seed (BRIEFING §5) -------------------------------------------------------

def test_seed_matches_briefing(api, tmp_path, monkeypatch):
    monkeypatch.setenv("SUPPLIERS_DB_PATH", str(tmp_path / "suppliers.json"))
    from api.inventory.seed import seed_data

    seed_data()
    products = api.get("/inventory/products").json()
    orders = api.get("/inventory/orders").json()
    assert 6 <= len(products) <= 8
    assert {p["product_category"] for p in products} == {"training_kit", "certification", "onboarding_equipment"}
    assert len({p["programme_id"] for p in products}) >= 3
    assert {p["office"] for p in products} == {"valencia", "miami"}
    assert 12 <= sum(o["type"] == "inbound" for o in orders) <= 15
    assert 12 <= sum(o["type"] == "outbound" for o in orders) <= 15

    by_name = {(p["name"], p["office"]): p for p in products}
    # Two prepared threshold cases: one outbound of 2 crosses the minimum.
    for key in [("Kit de certificación en ventas B2B", "valencia"), ("Manual de onboarding — soporte", "miami")]:
        p = by_name[key]
        assert p["current_stock"] >= p["min_stock"] > p["current_stock"] - 2
        assert outbound(api, p["id"], 2).json()["threshold_triggered"] is True
    # Prepared cost-variance case (supplier id as stored by the seed).
    kit = by_name[("Kit de certificación en ventas B2B", "valencia")]
    from sqlmodel import Session, select
    from api.inventory.models import TalentEntry

    with Session(db_module._get_engine()) as s:
        supplier_id = s.exec(select(TalentEntry.supplier_id).where(TalentEntry.talent_asset_id == kit["id"])).first()
    assert inbound(api, kit["id"], unit_cost=21.4, supplier_id=supplier_id).json()["cost_variance"]["variance_pct"] == 15.05


# -- schema migration of existing databases -----------------------------------

def test_existing_tables_get_new_columns(client, tmp_path, monkeypatch):
    from api.core.config import get_settings

    url = f"sqlite:///{tmp_path / 'old.db'}"
    old = create_engine(url)
    with old.begin() as conn:  # table as created by the talent-inventory milestone
        conn.execute(text("CREATE TABLE talent_assets (id VARCHAR PRIMARY KEY, name VARCHAR, skill_category VARCHAR, country VARCHAR, description VARCHAR)"))
        conn.execute(text("INSERT INTO talent_assets VALUES ('a1', 'Data Scientist', 'Data', 'Chile', NULL)"))
    monkeypatch.setenv("DATABASE_URL", url)
    get_settings.cache_clear()
    monkeypatch.setattr(db_module, "_engine", None)
    db_module.init_db()
    columns = {c["name"] for c in inspect(db_module._get_engine()).get_columns("talent_assets")}
    assert {"office", "product_category", "programme_id", "min_stock"} <= columns
    with db_module._get_engine().connect() as conn:
        assert conn.execute(text("SELECT office, min_stock FROM talent_assets")).one() == ("valencia", 5)


# -- telemetry ingest accepts text/plain (sendBeacon) --------------------------

def test_telemetry_ingest_accepts_text_plain(api):
    response = api.post("/telemetry/events", content=json.dumps({"events": []}),
                        headers={"Content-Type": "text/plain;charset=UTF-8"})
    assert response.status_code == 200
    assert response.json() == {"received": 0, "stored": 0, "rejected": 0}


def test_telemetry_ingest_rejects_invalid_json(api):
    response = api.post("/telemetry/events", content="{not json", headers={"Content-Type": "text/plain"})
    assert response.status_code == 422
