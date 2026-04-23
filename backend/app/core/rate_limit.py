"""Rate limiting configuration with slowapi.

Uses REDIS_CACHE_URL (db1) to avoid conflicts with Celery broker (db0).
"""

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings


def _get_real_ip(request: Request) -> str:
    """Extract client IP from X-Forwarded-For header (set by reverse proxy).

    Behind Docker/nginx the direct connection IP is always the proxy.
    We take the LAST entry in X-Forwarded-For because it is the one
    appended by the trusted reverse proxy closest to the app.  The first
    entry can be trivially spoofed by the client.
    Falls back to the direct connection address when the header is absent.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        ips = [ip.strip() for ip in forwarded.split(",")]
        return ips[-1]  # last IP added by trusted reverse proxy
    return get_remote_address(request)


limiter = Limiter(
    key_func=_get_real_ip,
    default_limits=["100/minute"],
    storage_uri=settings.REDIS_CACHE_URL,
)
