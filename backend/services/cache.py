"""MongoDB-backed 24h cache for live biological API responses.

All cached records must originate from a previous live API retrieval.
No manually entered biological data exists in this cache.
"""
from datetime import datetime, timezone, timedelta
from typing import Any, Optional
import hashlib
import json


CACHE_TTL_HOURS = 24


def _cache_key(namespace: str, payload: Any) -> str:
    raw = json.dumps({"ns": namespace, "p": payload}, sort_keys=True, default=str)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


class BioCache:
    def __init__(self, db):
        self.col = db.bio_cache

    async def get(self, namespace: str, payload: Any) -> Optional[Any]:
        key = _cache_key(namespace, payload)
        doc = await self.col.find_one({"_id": key})
        if not doc:
            return None
        fetched = datetime.fromisoformat(doc["fetched_at"])
        if datetime.now(timezone.utc) - fetched > timedelta(hours=CACHE_TTL_HOURS):
            await self.col.delete_one({"_id": key})
            return None
        return doc["data"]

    async def set(self, namespace: str, payload: Any, data: Any) -> None:
        key = _cache_key(namespace, payload)
        await self.col.replace_one(
            {"_id": key},
            {
                "_id": key,
                "namespace": namespace,
                "payload": payload,
                "data": data,
                "fetched_at": datetime.now(timezone.utc).isoformat(),
                "source": "live_api",
            },
            upsert=True,
        )
