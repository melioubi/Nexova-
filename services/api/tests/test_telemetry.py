"""Tests for telemetry storage: POST /telemetry/events + telemetry_events table.

Runs on SQLite by default. Set TELEMETRY_TEST_PG_URL (e.g.
postgresql://postgres@127.0.0.1:5433/nexova_test, with
migrations/001_telemetry_events.sql applied) to also run the Postgres checks:
JSONB, single INSERT statement per batch, append-only trigger.
"""

from __future__ import annotations

import copy
import json
import os
from pathlib import Path

import pytest
from sqlalchemy import create_engine, event, select, text

from api import db as db_module
from api.telemetry import contract
from api.telemetry.contract import TelemetryEvent
from api.telemetry.storage import store_events, telemetry_events

SERVICE_SCHEMA = Path(contract.SCHEMA_FILE)
DOCS_SCHEMA = Path(__file__).resolve().parents[3] / "docs" / "telemetry" / "event-schemas.json"
PG_URL = os.environ.get("TELEMETRY_TEST_PG_URL")


def examples() -> dict[str, dict]:
    doc = json.loads(SERVICE_SCHEMA.read_text(encoding="utf-8"))
    return {k: v["examples"][0] for k, v in doc["definitions"].items() if k != "envelope"}


EXAMPLES = examples()


def ev(event_type: str, **property_overrides) -> dict:
    raw = copy.deepcopy(EXAMPLES[event_type])
    raw["properties"].update(property_overrides)
    return raw


@pytest.fixture
def telemetry_client(client, tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path / 'telemetry.db'}")
    from api.core.config import get_settings

    get_settings.cache_clear()
    monkeypatch.setattr(db_module, "_engine", None)
    db_module.init_db()
    yield client


def stored_rows():
    with db_module._get_engine().connect() as conn:
        return [dict(r._mapping) for r in conn.execute(select(telemetry_events))]


# ---------------------------------------------------------------------------
# Contract (TelemetryEvent) — the schema from the previous project, unchanged
# ---------------------------------------------------------------------------

def test_service_schema_is_identical_to_the_plan_contract():
    if not DOCS_SCHEMA.exists():
        pytest.skip("docs/ not available (e.g. inside the Docker image)")
    assert SERVICE_SCHEMA.read_bytes() == DOCS_SCHEMA.read_bytes()


@pytest.mark.parametrize("event_type", sorted(EXAMPLES))
def test_every_catalog_example_is_a_valid_telemetry_event(event_type):
    assert TelemetryEvent.model_validate(EXAMPLES[event_type]).event_type == event_type


@pytest.mark.parametrize("mutate", [
    lambda e: e["properties"].update(candidate_name="Ana Pérez"),          # outside the allowlist
    lambda e: e["properties"].update(currency="USD"),                     # valencia must be EUR
    lambda e: e.update(timestamp="15/11/2026 10:42"),                     # not ISO 8601
    lambda e: e.update(event_type="InboundOrderCreated"),                 # not entidad_acción
    lambda e: e.update(event_type="order_teleported"),                    # unknown event_type
    lambda e: e["properties"].pop("programme_id"),                        # mandatory BRIEFING field
    lambda e: e.pop("requestId"),                                         # envelope field
    lambda e: e.update(extra_field=1),                                    # envelope allowlist
])
def test_contract_rejects(mutate):
    raw = ev("inbound_order_created")
    mutate(raw)
    with pytest.raises(Exception):
        TelemetryEvent.model_validate(raw)


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

def test_mixed_batch_stores_valid_and_counts_rejected(telemetry_client):
    invalid_pii = ev("outbound_order_created", recipient_name="Juan Soto")
    invalid_currency = ev("kit_cost_variance_detected", currency="USD")
    batch = [
        ev("inbound_order_created"),
        ev("outbound_order_created"),
        ev("login_failed"),
        invalid_pii,
        invalid_currency,
        {"event_type": "inbound_order_created"},
        "not-an-object",
    ]
    response = telemetry_client.post("/telemetry/events", json={"events": batch})
    assert response.status_code == 200
    assert response.json() == {"received": 7, "stored": 3, "rejected": 4}
    assert sorted(r["event_type"] for r in stored_rows()) == ["inbound_order_created", "login_failed", "outbound_order_created"]


def test_whole_catalog_in_one_batch(telemetry_client):
    response = telemetry_client.post("/telemetry/events", json={"events": list(EXAMPLES.values())})
    assert response.json() == {"received": 30, "stored": 30, "rejected": 0}


def test_all_invalid_batch_still_200(telemetry_client):
    response = telemetry_client.post("/telemetry/events", json={"events": [{}, {"x": 1}]})
    assert response.status_code == 200
    assert response.json() == {"received": 2, "stored": 0, "rejected": 2}


def test_empty_batch(telemetry_client):
    assert telemetry_client.post("/telemetry/events", json={"events": []}).json() == {"received": 0, "stored": 0, "rejected": 0}


@pytest.mark.parametrize("body", [{}, {"events": "x"}, {"events": {"a": 1}}, [ev("login_failed")]])
def test_unparseable_envelope_is_422(telemetry_client, body):
    assert telemetry_client.post("/telemetry/events", json=body).status_code == 422


def test_batch_size_limit(telemetry_client):
    response = telemetry_client.post("/telemetry/events", json={"events": [{}] * 501})
    assert response.status_code == 413


def test_database_down_returns_503_and_stores_nothing(telemetry_client, monkeypatch):
    from sqlalchemy.exc import OperationalError

    def boom(*_args, **_kwargs):
        raise OperationalError("insert", {}, Exception("db down"))

    monkeypatch.setattr("api.telemetry.router.store_events", boom)
    response = telemetry_client.post("/telemetry/events", json={"events": [ev("login_failed")]})
    assert response.status_code == 503


# ---------------------------------------------------------------------------
# Row mapping
# ---------------------------------------------------------------------------

def test_row_mapping_business_event(telemetry_client):
    raw = ev("inbound_order_created")
    telemetry_client.post("/telemetry/events", json={"events": [raw]})
    [row] = stored_rows()
    assert row["event_type"] == "inbound_order_created"
    assert row["service"] == "api"
    assert row["level"] == "info"
    assert float(row["value"]) == raw["properties"]["quantity"]
    assert row["timestamp"].isoformat().startswith("2026-11-15T10:42:17.123")
    tags = dict(row["tags"])
    envelope = tags.pop("_envelope")
    assert tags == raw["properties"]  # exactly the allowlisted properties
    for dim in ("office", "product_id", "product_category", "programme_id", "quantity", "currency"):
        assert dim in tags  # BRIEFING dimensions preserved
    assert envelope["eventId"] == raw["eventId"]
    assert envelope["requestId"] == raw["requestId"]
    assert envelope["userId"] == raw["userId"]
    assert "valencia" in row["message"] and "ventas-b2b" in row["message"]


@pytest.mark.parametrize("event_type,service,level", [
    ("api_error_returned", "api", "error"),
    ("frontend_error_captured", "backoffice", "error"),
    ("login_failed", "api", "warn"),
    ("stock_threshold_triggered", "api", "warn"),
    ("page_viewed", "backoffice", "info"),
    ("contact_request_submitted", "website", "info"),
    ("inventory_snapshot_recorded", "job", "info"),
])
def test_service_and_level_mapping(telemetry_client, event_type, service, level):
    telemetry_client.post("/telemetry/events", json={"events": [EXAMPLES[event_type]]})
    [row] = stored_rows()
    assert (row["service"], row["level"]) == (service, level)


def test_one_insert_statement_per_batch(telemetry_client):
    engine = db_module._get_engine()
    inserts = []

    @event.listens_for(engine, "before_cursor_execute")
    def count(conn, cursor, statement, params, context, executemany):
        if statement.lstrip().upper().startswith("INSERT INTO TELEMETRY_EVENTS"):
            inserts.append(executemany)

    try:
        telemetry_client.post("/telemetry/events", json={"events": [ev("page_viewed")] * 20})
    finally:
        event.remove(engine, "before_cursor_execute", count)
    assert len(inserts) == 1
    assert len(stored_rows()) == 20


# ---------------------------------------------------------------------------
# Real technical event emitted by the backend (no frontend change needed)
# ---------------------------------------------------------------------------

def test_failed_login_is_stored_without_pii(telemetry_client):
    telemetry_client.post("/auth/login", data={"username": "Nobody@Example.com", "password": "wrong-password"})
    [row] = [r for r in stored_rows() if r["event_type"] == "login_failed"]
    tags = row["tags"]
    assert tags["failure_reason"] == "invalid_credentials"
    assert len(tags["account_key_hash"]) == 16 and len(tags["client_ip_hash"]) == 16
    assert tags["_envelope"]["userId"] is None
    assert "nobody" not in json.dumps(row, default=str).lower()  # no email anywhere


def test_request_id_header_is_returned_and_correlated(telemetry_client):
    request_id = "8e7d6c5b-4a39-4b28-9c17-0f1e2d3c4b5a"
    response = telemetry_client.post(
        "/auth/login", data={"username": "x@example.com", "password": "wrong-password"},
        headers={"X-Request-Id": request_id},
    )
    assert response.headers["X-Request-Id"] == request_id
    [row] = stored_rows()
    assert row["tags"]["_envelope"]["requestId"] == request_id


def test_storage_module_never_updates_or_deletes():
    source = Path(contract.__file__).with_name("storage.py").read_text(encoding="utf-8").lower()
    for forbidden in ("update(", "delete(", ".update ", "truncate"):
        assert forbidden not in source.replace("default=dict", "")


# ---------------------------------------------------------------------------
# Postgres (Supabase-equivalent) checks — opt-in
# ---------------------------------------------------------------------------

pg = pytest.mark.skipif(not PG_URL, reason="set TELEMETRY_TEST_PG_URL to run Postgres checks")


@pytest.fixture
def pg_engine():
    engine = create_engine(PG_URL)
    yield engine
    engine.dispose()


@pg
def test_pg_bulk_insert_is_a_single_statement_with_jsonb(pg_engine):
    statements = []

    @event.listens_for(pg_engine, "before_cursor_execute")
    def capture(conn, cursor, statement, params, context, executemany):
        if "telemetry_events" in statement:
            statements.append(statement)

    events = [TelemetryEvent.model_validate(raw) for raw in EXAMPLES.values()]
    assert store_events(pg_engine, events) == 30
    assert len(statements) == 1 and statements[0].count("VALUES") == 1
    with pg_engine.connect() as conn:
        kind = conn.execute(text("select jsonb_typeof(tags) from telemetry_events order by \"timestamp\" desc limit 1")).scalar()
        found = conn.execute(text("select count(*) from telemetry_events where tags @> '{\"office\": \"valencia\"}'")).scalar()
    assert kind == "object" and found >= 1


@pg
@pytest.mark.parametrize("sql", ["update telemetry_events set level = 'error'", "delete from telemetry_events"])
def test_pg_table_is_append_only(pg_engine, sql):
    from sqlalchemy.exc import DBAPIError

    with pytest.raises(DBAPIError, match="append-only"):
        with pg_engine.begin() as conn:
            conn.execute(text(sql))
