"""Caching policy for the inventory read endpoints.

Decisions (measured, see CACHING_REPORT.md):

* ``GET /inventory/products`` — ~96 ms p50 with 270 assets (1 + 2·N SUM
  queries). Called on every visit to the products page AND on mount of both
  order forms. TTL 30 s.
* ``GET /inventory/orders`` — ~1 070 ms p50 with ~48k ledger rows. TTL 300 s.

Both responses are identical for every authenticated user (they are not
filtered by ``current_user``), so the key is shared. The auth dependency runs
*before* the cache lookup, so an anonymous request never reaches the cache.

What is cached is the **serialized JSON body** (bytes), produced with the same
Pydantic schema declared as ``response_model``. Caching the Python objects
instead would still pay the response_model validation + serialization on every
hit, which is most of the cost for 48k orders.

Invalidation: every write in ``service.py`` calls one of the functions below
after its commit. TTL is the safety net for writes that bypass the API (seed
scripts, manual edits in Supabase).
"""

from collections.abc import Callable
from typing import Any

from fastapi import Response
from pydantic import TypeAdapter

from api.core.cache import cache

PRODUCTS_NS = "inventory:products"
ORDERS_NS = "inventory:orders"

PRODUCTS_TTL_SECONDS = 30
ORDERS_TTL_SECONDS = 300


def cached_json(
    namespace: str,
    ttl: float,
    loader: Callable[[], Any],
    adapter: TypeAdapter,
    key: str = "all",
) -> Response:
    """Serve ``loader()`` serialized with ``adapter`` from cache when possible.

    Adds ``X-Cache: HIT|MISS`` so the effect is visible in the timing log,
    in curl and in the browser's network tab.
    """
    body, hit = cache.get_or_set(namespace, key, ttl, lambda: adapter.dump_json(loader()))
    status = "HIT" if hit else ("MISS" if cache.enabled else "BYPASS")
    return Response(content=body, media_type="application/json", headers={"X-Cache": status})


def invalidate_products() -> None:
    """A new asset changes the product list but no order exists for it yet."""
    cache.invalidate(PRODUCTS_NS)


def invalidate_stock_and_orders() -> None:
    """An inbound/outbound order changes stock (products) and the ledger (orders)."""
    cache.invalidate(PRODUCTS_NS, ORDERS_NS)
