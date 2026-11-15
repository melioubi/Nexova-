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
from typing import Annotated, Any

from fastapi import APIRouter, Body, HTTPException, status
from pydantic import BaseModel, ValidationError
from sqlalchemy.exc import SQLAlchemyError

from api.db import _get_engine
from api.telemetry.contract import TelemetryEvent
from api.telemetry.storage import store_events

logger = logging.getLogger("api.telemetry")

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


@router.post("/events", response_model=TelemetryIngestResult)
def ingest_events(payload: Annotated[dict[str, Any], Body()]) -> TelemetryIngestResult:
    raw_events = payload.get("events")
    if not isinstance(raw_events, list):
        raise HTTPException(status_code=422, detail="Body must be an object with an 'events' array.")
    if len(raw_events) > MAX_BATCH:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=f"Batch too large: max {MAX_BATCH} events per request.",
        )

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
