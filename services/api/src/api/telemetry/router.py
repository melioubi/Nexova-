"""POST /telemetry/events — validate each event, bulk-store the valid ones.

Partial acceptance by design (telemetry-plan.md §9):

* The body is parsed **loosely** as ``{"events": [<any>, ...]}``. It is NOT
  typed as ``list[TelemetryEvent]``: that would make FastAPI answer 422 for
  the whole batch when a single event is invalid.
* Each raw item goes through ``TelemetryEvent.model_validate`` inside
  ``try/except ValidationError``: invalid items are counted in ``rejected``
  and the loop continues.
* All valid items are written with ONE bulk insert (one transaction).
* 200 + ``{"received", "stored", "rejected"}`` whenever the envelope itself is
  parseable. 422 only if the body has no ``events`` array; 413 if the batch is
  larger than ``MAX_BATCH``; 503 if the database is unavailable (nothing of the
  batch is stored, so the client can safely retry the same batch).
"""

from __future__ import annotations

import logging
import json
from collections import Counter
from typing import Any

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, ValidationError
from sqlalchemy.exc import SQLAlchemyError

from api.db import _get_engine
from api.telemetry.contract import TelemetryEvent
from api.telemetry.storage import store_events

logger = logging.getLogger("api.telemetry")
if not logger.handlers:
    _handler = logging.StreamHandler()
    _handler.setFormatter(logging.Formatter("%(asctime)s %(name)s %(levelname)s %(message)s"))
    logger.addHandler(_handler)
    logger.setLevel(logging.INFO)
    logger.propagate = False

router = APIRouter(prefix="/telemetry", tags=["telemetry"])

# The plan's client flushes every 20 events / 10 s (telemetry-plan.md §5.4).
# 500 leaves room for bursts and offline buffers while bounding request cost.
MAX_BATCH = 500


class TelemetryIngestResult(BaseModel):
    received: int
    stored: int
    rejected: int


def validate_batch(raw_events: list[Any]) -> tuple[list[TelemetryEvent], int]:
    """Per-item validation. Returns (valid events, number rejected)."""
    valid: list[TelemetryEvent] = []
    rejected = 0
    for index, raw in enumerate(raw_events):
        try:
            valid.append(TelemetryEvent.model_validate(raw))
        except ValidationError as error:
            rejected += 1
            event_type = raw.get("event_type") if isinstance(raw, dict) else None
            # Locations, error types and messages only — never the input values
            # (PII). The contract's schema message already lists only paths and
            # JSON Schema keywords.
            reasons = "; ".join(
                f"{'.'.join(map(str, e['loc'])) or '<event>'}:{e['type']}:{e['msg'][:160]}"
                for e in error.errors(include_input=False)[:3]
            )
            logger.warning("telemetry event rejected index=%s event_type=%r reasons=%s", index, event_type, reasons)
    return valid, rejected


def _parse_envelope(body: bytes) -> list[Any]:
    """The body is JSON whatever the Content-Type: the frontend sends
    ``text/plain`` on purpose (CORS-safelisted, so ``navigator.sendBeacon``
    and the periodic flush need no preflight request)."""
    try:
        payload = json.loads(body or b"null")
    except ValueError:
        raise HTTPException(status_code=422, detail="Body must be valid JSON.")
    raw_events = payload.get("events") if isinstance(payload, dict) else None
    if not isinstance(raw_events, list):
        raise HTTPException(status_code=422, detail="Body must be an object with an 'events' array.")
    return raw_events


@router.post(
    "/events",
    response_model=TelemetryIngestResult,
    openapi_extra={"requestBody": {"required": True, "content": {
        "application/json": {"schema": {"type": "object", "required": ["events"],
                                        "properties": {"events": {"type": "array", "items": {"type": "object"}}}}},
        "text/plain": {"schema": {"type": "string"}},
    }}},
)
async def ingest_events(request: Request) -> TelemetryIngestResult:
    raw_events = _parse_envelope(await request.body())
    return await run_in_threadpool(_ingest, raw_events)


def _ingest(raw_events: list[Any]) -> TelemetryIngestResult:
    if not isinstance(raw_events, list):
        raise HTTPException(status_code=422, detail="Body must be an object with an 'events' array.")
    if len(raw_events) > MAX_BATCH:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=f"Batch too large: max {MAX_BATCH} events per request.",
        )

    types = Counter(e.get("event_type") if isinstance(e, dict) else "<not-an-object>" for e in raw_events)
    logger.info("telemetry batch received: %s events %s", len(raw_events), dict(types))
    valid, rejected = validate_batch(raw_events)
    try:
        stored = store_events(_get_engine(), valid)
    except SQLAlchemyError:
        logger.exception("telemetry batch could not be stored (%s valid events)", len(valid))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Telemetry storage unavailable. Retry the batch later.",
        )
    return TelemetryIngestResult(received=len(raw_events), stored=stored, rejected=rejected)
