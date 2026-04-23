"""Async Redis client for API caching (db 1)."""

import redis.asyncio as redis

from app.core.config import settings

redis_client = redis.from_url(
    settings.REDIS_CACHE_URL,
    decode_responses=True,
    max_connections=20,
    socket_timeout=5,
    socket_connect_timeout=5,
    retry_on_timeout=True,
)
