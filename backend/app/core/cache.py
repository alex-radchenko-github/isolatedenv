"""Redis caching helpers with stampede protection."""

from __future__ import annotations

import asyncio
import json
from collections.abc import Awaitable, Callable
from typing import TypeVar

import structlog

from app.core.redis import redis_client

logger = structlog.get_logger(__name__)

T = TypeVar("T")


async def cached(key: str, ttl: int, fetch_fn: Callable[[], Awaitable[T]]) -> T:
    """Return cached value or call *fetch_fn*, store the result, and return it.

    Includes lock-based stampede protection: if the lock is not acquired,
    wait briefly and recheck cache before calling fetch_fn.
    """
    try:
        raw = await redis_client.get(key)
        if raw is not None:
            return json.loads(raw)  # type: ignore[return-value]
    except Exception:
        logger.warning("redis_get_failed", key=key)

    # Try to acquire a lock
    lock_key = f"lock:{key}"
    try:
        acquired = await redis_client.set(lock_key, "1", nx=True, ex=10)
    except Exception:
        acquired = False

    if acquired:
        try:
            result = await fetch_fn()
            try:
                await redis_client.set(key, json.dumps(result, default=str), ex=ttl)
            except Exception:
                logger.warning("redis_set_failed", key=key)
            return result
        finally:
            try:
                await redis_client.delete(lock_key)
            except Exception:
                pass
    else:
        # Another worker is computing — retry cache reads
        for _ in range(5):
            await asyncio.sleep(0.3)
            try:
                raw = await redis_client.get(key)
                if raw is not None:
                    return json.loads(raw)  # type: ignore[return-value]
            except Exception:
                pass

        # Fallback: all retries exhausted, compute directly but do NOT
        # write to cache -- let the next request benefit from a normal
        # lock cycle to avoid stampede race in this fallback path.
        return await fetch_fn()


async def invalidate(pattern: str) -> int:
    """Delete all keys matching *pattern* using UNLINK (non-blocking) in batches of 1000."""
    deleted = 0
    try:
        keys: list[str] = []
        async for key in redis_client.scan_iter(match=pattern):
            keys.append(key)

        if keys:
            for i in range(0, len(keys), 1000):
                batch = keys[i : i + 1000]
                pipe = redis_client.pipeline()
                for key in batch:
                    pipe.unlink(key)
                results = await pipe.execute()
                deleted += sum(1 for r in results if r)
    except Exception:
        logger.warning("redis_invalidate_failed", pattern=pattern)
    return deleted
