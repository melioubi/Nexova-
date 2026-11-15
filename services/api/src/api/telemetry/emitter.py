"""Server-side emission of telemetry events (``context.source = backend_api``).

Backend events go through exactly the same path as the ones received over
HTTP: build envelope → ``TelemetryEvent.model_validate`` (allowlist) →
``store_events``. Telemetry must never break the business request, so any
failure is logged and swallowed (telemetry-plan.md §5.4).
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import os
import secrets
from datetime import UTC, date, datetime
from typing import Any
from uuid import UUID, uuid4

from pydantic import ValidationError

from api.core.config import get_settings
from api.db import _get_engine
from api.telemetry.contract import TelemetryEvent
from api.telemetry.storage import store_events

logger = logging.getLogger("api.telemetry")

_ENVIRONMENTS = {"development", "staging", "production"}
_FALLBACK_PEPPER = secrets.token_bytes(32)
_ip_salts: dict[date, bytes] = {}


def _environment() -> str:
    mode = os.environ.get("APP_MODE", "development").lower()
    return mode if mode in _ENVIRONMENTS else "development"


def _app_version() -> str:
    version = os.environ.get("APP_VERSION", "").lower()
    return version if 7 <= len(version) <= 12 and all(c in "0123456789abcdef" for c in version) else "0000000"


def _pepper() -> bytes:
    configured = get_settings().telemetry_hash_pepper
    if configured:
        return configured.encode()
    # Without a configured pepper hashes are still non-reversible, but they
    # change on every restart (fine for local dev, not for production).
    return _FALLBACK_PEPPER


def account_key_hash(email: str) -> str:
    """HMAC-SHA256(normalised email, pepper) → 16 hex (plan §4.5)."""
    normalised = email.strip().lower().encode()
    return hmac.new(_pepper(), normalised, hashlib.sha256).hexdigest()[:16]


def client_ip_hash(ip: str | None) -> str:
    """HMAC-SHA256(IP, daily random salt) → 16 hex. The salt lives only in
    memory and only today's and yesterday's are kept, so the same IP cannot be
    followed across days (plan §4.5)."""
    today = datetime.now(UTC).date()
    if today not in _ip_salts:
        _ip_salts[today] = secrets.token_bytes(32)
        for old in [d for d in _ip_salts if (today - d).days > 1]:
            del _ip_salts[old]
    return hmac.new(_ip_salts[today], (ip or "unknown").encode(), hashlib.sha256).hexdigest()[:16]


def _uuid_or_none(value: Any) -> str | None:
    try:
        return str(UUID(str(value)))
    except (TypeError, ValueError):
        return None


def build_event(
    event_type: str,
    properties: dict[str, Any],
    *,
    request_id: str | None,
    session_id: str | None = None,
    user_id: str | None = None,
) -> dict[str, Any]:
    now = datetime.now(UTC)
    return {
        "eventId": str(uuid4()),
        "timestamp": now.strftime("%Y-%m-%dT%H:%M:%S.") + f"{now.microsecond // 1000:03d}Z",
        "sessionId": _uuid_or_none(session_id),
        "userId": _uuid_or_none(user_id),
        "event_type": event_type,
        "schemaVersion": "1.0.0",
        "requestId": _uuid_or_none(request_id) or str(uuid4()),
        "context": {"source": "backend_api", "environment": _environment(), "appVersion": _app_version()},
        "properties": properties,
    }


def emit(event_type: str, properties: dict[str, Any], **ids: str | None) -> bool:
    """Validate and store one backend event. Never raises."""
    try:
        event = TelemetryEvent.model_validate(build_event(event_type, properties, **ids))
        store_events(_get_engine(), [event])
        return True
    except ValidationError:
        logger.exception("backend telemetry event %s does not match its schema (dropped)", event_type)
    except Exception:  # noqa: BLE001 — telemetry must not break the request
        logger.exception("backend telemetry event %s could not be stored", event_type)
    return False
