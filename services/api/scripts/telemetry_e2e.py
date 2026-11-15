"""End-to-end check of telemetry storage against a running API.

1. Sends ONE mixed batch to POST /telemetry/events: valid business events
   (inventory, BRIEFING mandatory), valid technical events, and invalid ones
   (property outside the allowlist, office/currency mismatch, unknown type).
2. Triggers a REAL technical event: a failed login, emitted by the backend
   itself (login_failed) — exactly what happens when someone types a wrong
   password in the backoffice.
3. Prints the JSON response (received / stored / rejected).

Usage (API running with DATABASE_URL pointing to Supabase):
    uv run python scripts/telemetry_e2e.py --base http://127.0.0.1:8000
Then check the rows in Supabase → Table Editor → telemetry_events.
"""

from __future__ import annotations

import argparse
import copy
import json
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import UTC, datetime
from pathlib import Path

SCHEMA = Path(__file__).resolve().parents[1] / "src" / "api" / "telemetry" / "event-schemas.json"


def fresh(example: dict, **props) -> dict:
    raw = copy.deepcopy(example)
    now = datetime.now(UTC)
    raw["eventId"] = str(uuid.uuid4())
    raw["requestId"] = str(uuid.uuid4())
    raw["timestamp"] = now.strftime("%Y-%m-%dT%H:%M:%S.") + f"{now.microsecond // 1000:03d}Z"
    raw["context"]["environment"] = "development"
    raw["properties"].update(props)
    return raw


def post(url: str, body: bytes, ctype: str) -> tuple[int, str]:
    req = urllib.request.Request(url, data=body, method="POST", headers={"Content-Type": ctype})
    try:
        with urllib.request.urlopen(req) as res:
            return res.status, res.read().decode()
    except urllib.error.HTTPError as err:
        return err.code, err.read().decode()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://127.0.0.1:8000")
    base = ap.parse_args().base.rstrip("/")
    ex = {k: v["examples"][0] for k, v in json.loads(SCHEMA.read_text())["definitions"].items() if k != "envelope"}

    batch = [
        # valid — business (BRIEFING mandatory)
        fresh(ex["inbound_order_created"]),
        fresh(ex["outbound_order_created"]),
        fresh(ex["stock_threshold_triggered"]),
        fresh(ex["kit_cost_variance_detected"]),
        # valid — technical
        fresh(ex["api_error_returned"]),
        fresh(ex["page_viewed"]),
        # invalid
        fresh(ex["outbound_order_created"], recipient_name="Juan Soto"),   # PII outside the allowlist
        fresh(ex["inbound_order_created"], currency="USD"),               # valencia must be EUR
        {**fresh(ex["page_viewed"]), "event_type": "page_teleported"},     # unknown event_type
    ]
    status, body = post(f"{base}/telemetry/events", json.dumps({"events": batch}).encode(), "application/json")
    print(f"POST /telemetry/events → HTTP {status}")
    print(json.dumps(json.loads(body), indent=2))

    status, _ = post(f"{base}/auth/login",
                     urllib.parse.urlencode({"username": "e2e-check@example.com", "password": "wrong-password"}).encode(),
                     "application/x-www-form-urlencoded")
    print(f"POST /auth/login (wrong password) → HTTP {status} · the backend stored a real login_failed event")


if __name__ == "__main__":
    main()
