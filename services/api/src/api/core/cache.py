"""In-process TTL cache with namespace invalidation.

Why in-process (and not Redis) at this stage — see CACHING_REPORT.md:
the API runs as a single uvicorn process (``services/Dockerfile``), so one
dictionary per process is coherent and adds no infrastructure. If the API is
ever started with ``--workers N`` or several replicas, each process would hold
its own copy and a write would only invalidate the copy of the process that
handled it; at that point this class should be swapped for a Redis-backed
implementation with the same three methods (``get_or_set``, ``invalidate``,
``clear``).

Guarantees:

* **Every entry expires** (``ttl`` is mandatory and must be > 0).
* **Explicit invalidation** per namespace: writes call ``invalidate(ns)``.
* **No stale write-back**: if a slow read started *before* an invalidation
  finishes *after* it, its (now outdated) result is returned to that caller
  but is NOT stored. Implemented with a generation counter per namespace.
* **Stampede protection**: concurrent misses on the same key wait for the
  first loader instead of all hitting the database at once.
* **Bounded memory**: at most ``max_entries`` keys (oldest evicted first).

Callers are responsible for the key: it must never be shared between users
when the cached value depends on who is asking.
"""

from __future__ import annotations

import threading
import time
from collections import OrderedDict
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any, TypeVar

T = TypeVar("T")


@dataclass(slots=True)
class _Entry:
    value: Any
    expires_at: float
    generation: int


class TTLCache:
    def __init__(self, max_entries: int = 128, clock: Callable[[], float] = time.monotonic) -> None:
        self._entries: OrderedDict[tuple[str, str], _Entry] = OrderedDict()
        self._generations: dict[str, int] = {}
        self._key_locks: dict[tuple[str, str], threading.Lock] = {}
        self._lock = threading.Lock()
        self._max_entries = max_entries
        self._clock = clock
        self.enabled = True
        self.hits = 0
        self.misses = 0

    # -- internal helpers (call with self._lock held) -------------------------

    def _lookup(self, full_key: tuple[str, str]) -> tuple[bool, Any]:
        entry = self._entries.get(full_key)
        if entry is None:
            return False, None
        stale = entry.generation != self._generations.get(full_key[0], 0)
        if stale or entry.expires_at <= self._clock():
            del self._entries[full_key]
            return False, None
        return True, entry.value

    # -- public API -----------------------------------------------------------

    def get_or_set(self, namespace: str, key: str, ttl: float, loader: Callable[[], T]) -> tuple[T, bool]:
        """Return ``(value, hit)``. Calls ``loader`` only on a miss."""
        if ttl <= 0:
            raise ValueError("Every cached value needs a positive TTL")
        if not self.enabled:
            return loader(), False

        full_key = (namespace, key)
        with self._lock:
            found, value = self._lookup(full_key)
            if found:
                self.hits += 1
                return value, True
            key_lock = self._key_locks.setdefault(full_key, threading.Lock())

        with key_lock:
            # Another request may have filled the key while we waited.
            with self._lock:
                found, value = self._lookup(full_key)
                if found:
                    self.hits += 1
                    return value, True
                generation = self._generations.get(namespace, 0)
                self.misses += 1

            value = loader()  # outside the global lock: other keys stay available

            with self._lock:
                if self._generations.get(namespace, 0) == generation:
                    self._entries[full_key] = _Entry(value, self._clock() + ttl, generation)
                    self._entries.move_to_end(full_key)
                    while len(self._entries) > self._max_entries:
                        self._entries.popitem(last=False)
            return value, False

    def invalidate(self, *namespaces: str) -> None:
        """Drop every entry of the given namespaces (called after writes)."""
        with self._lock:
            for namespace in namespaces:
                self._generations[namespace] = self._generations.get(namespace, 0) + 1
                for full_key in [k for k in self._entries if k[0] == namespace]:
                    del self._entries[full_key]

    def clear(self) -> None:
        with self._lock:
            self._entries.clear()
            self._generations.clear()
            self.hits = self.misses = 0

    def stats(self) -> dict[str, int]:
        with self._lock:
            return {"entries": len(self._entries), "hits": self.hits, "misses": self.misses}


# Single process-wide instance used by the routers.
cache = TTLCache()
