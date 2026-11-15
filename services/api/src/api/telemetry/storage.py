"""Persistence of telemetry events in ``telemetry_events`` (Supabase/Postgres).

* The table is created by ``migrations/001_telemetry_events.sql`` (indexes,
  append-only trigger, RLS). The SQLAlchemy ``Table`` below mirrors it so the
  backend can insert; in SQLite (local dev/tests) it is created on startup.
* ``store_events`` writes a whole batch in ONE transaction with ONE
  multi-row ``INSERT … VALUES (…), (…), …`` statement (SQLAlchemy 2
  "insertmanyvalues"). Never one INSERT per event.
* This module never issues UPDATE or DELETE: events are immutable facts.

Row mapping (documented in docs/telemetry/telemetry-plan.md §9):

=============  ===============================================================
column         source
=============  ===============================================================
timestamp      event.timestamp (UTC)
service        event.context.source → backoffice | website | api | job
event_type     event.event_type
level          LEVELS[event_type] (default info)
value          event.properties[VALUE_PROPERTY[event_type]] if present
message        short human summary built from allowlisted dimensions (no PII)
tags           event.properties (already allowlisted) + "_envelope"
=============  ===============================================================
"""

from __future__ import annotations

from collections.abc import Iterable
from typing import Any
from uuid import uuid4

from sqlalchemy import (
    JSON,
    Column,
    DateTime,
    MetaData,
    Numeric,
    Table,
    Text,
    Uuid,
    insert,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.engine import Engine

from api.telemetry.contract import TelemetryEvent

metadata = MetaData()

telemetry_events = Table(
    "telemetry_events",
    metadata,
    Column("id", Uuid, primary_key=True, default=uuid4),
    Column("timestamp", DateTime(timezone=True), nullable=False),
    Column("service", Text, nullable=False),
    Column("event_type", Text, nullable=False),
    Column("level", Text, nullable=False, default="info"),
    Column("value", Numeric, nullable=True),
    Column("message", Text, nullable=True),
    Column("tags", JSON().with_variant(JSONB(), "postgresql"), nullable=False, default=dict),
)

# --------------------------------------------------------------------------
# Mapping rules
# --------------------------------------------------------------------------

SERVICE_BY_SOURCE = {
    "frontend_backoffice": "backoffice",
    "frontend_website": "website",
    "backend_api": "api",
    "backend_job": "job",
}

# error: something is broken · warn: the system rejected/degraded something that
# a human should look at · info (default): normal business or usage fact.
LEVELS = {
    "api_error_returned": "error",
    "frontend_error_captured": "error",
    "direct_stock_edit_rejected": "warn",
    "kit_cost_variance_detected": "warn",
    "stock_threshold_triggered": "warn",
    "outbound_order_rejected": "warn",
    "order_validation_failed": "warn",
    "login_failed": "warn",
    "access_denied": "warn",
    "api_request_failed": "warn",
    "db_query_slow_detected": "warn",
    "telemetry_events_dropped": "warn",
    "session_expired": "warn",
}

# The single numeric property that best summarises each event (for SUM/AVG
# without opening the JSONB). Events not listed have value = NULL.
VALUE_PROPERTY = {
    "inbound_order_created": "quantity",
    "outbound_order_created": "quantity",
    "outbound_order_rejected": "quantity",
    "stock_threshold_triggered": "quantity",
    "stock_threshold_cleared": "episode_duration_minutes",
    "direct_stock_edit_rejected": "quantity",
    "kit_cost_variance_detected": "variance_pct",
    "inventory_snapshot_recorded": "quantity",
    "order_form_abandoned": "time_on_form_ms",
    "supplier_rate_updated": "change_pct",
    "session_expired": "session_age_minutes",
    "user_logged_out": "session_duration_minutes",
    "api_latency_recorded": "p95_ms",
    "page_load_recorded": "lcp_ms",
    "db_query_slow_detected": "duration_ms",
    "api_error_returned": "occurrence_count",
    "api_request_failed": "duration_ms",
    "list_filter_applied": "result_count",
    "telemetry_events_dropped": "dropped_count",
    "contact_section_viewed": "scroll_depth_pct",
}

# Dimensions shown in the message, in this order, when present. All of them
# are enums/IDs from the allowlist — never free text or personal data.
MESSAGE_DIMENSIONS = (
    "office", "programme_id", "product_category", "currency", "recipient_type",
    "direction", "failure_reason", "attempt_channel", "endpoint", "route",
    "http_status", "status_class", "error_class", "reason",
)


def to_row(event: TelemetryEvent) -> dict[str, Any]:
    props = dict(event.properties)
    value_key = VALUE_PROPERTY.get(event.event_type)
    value = props.get(value_key) if value_key else None
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        value = None
    dims = [f"{k}={props[k]}" for k in MESSAGE_DIMENSIONS if props.get(k) is not None]
    message = event.event_type + (f" · {value_key}={value}" if value is not None else "")
    if dims:
        message += " · " + ", ".join(dims)
    tags = {
        **props,
        # Envelope fields needed for analysis (sessions, per-user aggregation,
        # frontend↔backend↔logs correlation, dedup). Namespaced under a key that
        # can never collide with an allowlisted property (those are snake_case
        # without a leading underscore).
        "_envelope": {
            "eventId": str(event.eventId),
            "sessionId": str(event.sessionId) if event.sessionId else None,
            "userId": str(event.userId) if event.userId else None,
            "requestId": str(event.requestId),
            "schemaVersion": event.schemaVersion,
            "source": event.context.source,
            "environment": event.context.environment,
            "appVersion": event.context.appVersion,
        },
    }
    return {
        "id": uuid4(),
        "timestamp": event.timestamp,
        "service": SERVICE_BY_SOURCE[event.context.source],
        "event_type": event.event_type,
        "level": LEVELS.get(event.event_type, "info"),
        "value": value,
        "message": message[:500],
        "tags": tags,
    }


def store_events(engine: Engine, events: Iterable[TelemetryEvent]) -> int:
    """Insert all events in one transaction and one statement. Returns rows stored.

    All-or-nothing: if the database fails, nothing of the batch is stored and
    the exception propagates (the endpoint answers 503 so the client retries).
    """
    rows = [to_row(event) for event in events]
    if not rows:
        return 0
    with engine.begin() as connection:
        connection.execute(insert(telemetry_events), rows)
    return len(rows)


def create_table_for_local_dev(engine: Engine) -> None:
    """SQLite only. In Postgres/Supabase the table comes from the SQL migration
    (with its indexes, immutability trigger and RLS) — never from create_all."""
    if engine.dialect.name == "sqlite":
        metadata.create_all(engine)
