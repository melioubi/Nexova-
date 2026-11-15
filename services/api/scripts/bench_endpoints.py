"""Measure server-side latency of the read endpoints (no extra dependencies).

Reads the ``X-Response-Time-ms`` header written by the timing middleware in
``api.main`` — so the numbers are the cost of the endpoint itself, not network
or client overhead — and the ``X-Cache`` header (HIT / MISS) when present.

Usage (API already running):

    uv run python scripts/bench_endpoints.py --base http://127.0.0.1:8765 -n 30
"""

from __future__ import annotations

import argparse
import json
import statistics
import urllib.error
import urllib.parse
import urllib.request
import uuid
from typing import Any

ENDPOINTS = [
    "/inventory/products",
    "/inventory/orders",
    "/suppliers",
    "/suppliers?country=Spain&category=job_boards",
    "/candidates",
    "/auth/me",
]


def call(base: str, path: str, method: str = "GET", token: str | None = None,
         body: bytes | None = None, ctype: str | None = None) -> tuple[int, Any, bytes]:
    req = urllib.request.Request(base + path, data=body, method=method)
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    if ctype:
        req.add_header("Content-Type", ctype)
    try:
        with urllib.request.urlopen(req) as res:
            return res.status, res.headers, res.read()
    except urllib.error.HTTPError as err:
        return err.code, err.headers, err.read()


def login(base: str) -> str:
    email = f"bench-{uuid.uuid4().hex[:8]}@example.com"
    password = "bench-password-123"
    call(base, "/users", "POST", body=json.dumps({"email": email, "password": password}).encode(),
         ctype="application/json")
    _, _, raw = call(base, "/auth/login", "POST",
                     body=urllib.parse.urlencode({"username": email, "password": password}).encode(),
                     ctype="application/x-www-form-urlencoded")
    return json.loads(raw)["access_token"]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://127.0.0.1:8000")
    parser.add_argument("-n", type=int, default=30)
    args = parser.parse_args()

    token = login(args.base)
    print(f"| Endpoint | Filas JSON | 1ª petición (ms) | p50 (ms) | p95 (ms) | Caché (1ª / resto) |")
    print("|---|---|---|---|---|---|")
    for path in ENDPOINTS:
        times, caches, rows = [], [], 0
        for _ in range(args.n):
            status, headers, raw = call(args.base, path, token=token)
            if status != 200:
                raise SystemExit(f"{path} → {status}: {raw[:200]!r}")
            times.append(float(headers.get("X-Response-Time-ms", "nan")))
            caches.append(headers.get("X-Cache", "—"))
            data = json.loads(raw)
            rows = len(data) if isinstance(data, list) else 1
        rest = sorted(times[1:])
        p95 = rest[max(0, int(len(rest) * 0.95) - 1)]
        rest_cache = "/".join(sorted(set(caches[1:])))
        print(f"| `GET {path}` | {rows} | {times[0]:.1f} | {statistics.median(rest):.1f} | "
              f"{p95:.1f} | {caches[0]} / {rest_cache} |")


if __name__ == "__main__":
    main()
