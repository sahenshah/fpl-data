from dataclasses import dataclass
from time import monotonic
from typing import Any


@dataclass
class CacheEntry:
    value: Any
    expires_at: float
    etag: str


class TtlCache:
    def __init__(self) -> None:
        self._entries: dict[str, CacheEntry] = {}

    def get(self, key: str) -> CacheEntry | None:
        entry = self._entries.get(key)
        if entry is None or entry.expires_at <= monotonic():
            self._entries.pop(key, None)
            return None
        return entry

    def put(self, key: str, value: Any, ttl_seconds: int, etag: str) -> CacheEntry:
        entry = CacheEntry(value=value, expires_at=monotonic() + ttl_seconds, etag=etag)
        self._entries[key] = entry
        return entry

    def clear(self) -> None:
        self._entries.clear()


cache = TtlCache()
