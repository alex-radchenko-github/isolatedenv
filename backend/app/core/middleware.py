"""Custom middleware: Request ID tracking, Prometheus metrics & security headers (pure ASGI, no BaseHTTPMiddleware)."""

import re
import time
import uuid
from contextvars import ContextVar

import structlog
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.metrics import REQUEST_COUNT, REQUEST_LATENCY

# Regex for normalizing dynamic path segments in Prometheus labels.
# Without this, each unique UUID/int creates a separate time series (label explosion).
_UUID_RE = re.compile(
    r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", re.I,
)
_INT_RE = re.compile(r"/\d+(?=/|$)")

# Regex for validating externally-supplied X-Request-ID headers.
# Only allow safe characters and limit length to prevent log injection / overflow.
_VALID_REQUEST_ID_RE = re.compile(r"^[a-zA-Z0-9._-]{1,64}$")


def _normalize_path(path: str) -> str:
    """Replace UUIDs and integer IDs in URL path with placeholders.

    Prevents Prometheus label cardinality explosion from per-resource URLs.
    """
    path = _UUID_RE.sub("{id}", path)
    path = _INT_RE.sub("/{n}", path)
    return path

request_id_var: ContextVar[str] = ContextVar("request_id", default="")


class RequestIDMiddleware:
    """Generate or propagate X-Request-ID header and bind to structlog context.

    Pure ASGI implementation avoids the known issues with BaseHTTPMiddleware
    (request body consumption, streaming response buffering).

    Externally-supplied X-Request-ID values are validated against a safe
    character pattern; invalid values are replaced with a generated UUID.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] not in ("http", "websocket"):
            await self.app(scope, receive, send)
            return

        # Extract existing request-id from headers or generate a new one
        headers_raw: list[tuple[bytes, bytes]] = scope.get("headers", [])
        rid: str | None = None
        for name, value in headers_raw:
            if name == b"x-request-id":
                candidate = value.decode("latin-1")
                # Validate against safe pattern; reject crafted values
                if _VALID_REQUEST_ID_RE.match(candidate):
                    rid = candidate
                break
        if not rid:
            rid = uuid.uuid4().hex

        request_id_var.set(rid)
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=rid)

        # Prometheus metrics: start timer
        method = scope.get("method", "UNKNOWN")
        path = scope.get("path", "/")
        start_time = time.perf_counter()
        status_code = "500"  # default in case of unhandled error

        async def send_with_header(message: Message) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = str(message.get("status", 500))
                headers = list(message.get("headers", []))
                headers.append((b"x-request-id", rid.encode("latin-1")))
                message["headers"] = headers
            await send(message)

        try:
            await self.app(scope, receive, send_with_header)
        finally:
            if scope["type"] == "http":
                duration = time.perf_counter() - start_time
                normalized = _normalize_path(path)
                REQUEST_COUNT.labels(method=method, endpoint=normalized, status=status_code).inc()
                REQUEST_LATENCY.labels(method=method, endpoint=normalized).observe(duration)


class SecurityHeadersMiddleware:
    """Add security headers to every HTTP response.

    Pure ASGI implementation -- same pattern as RequestIDMiddleware.
    """

    SECURITY_HEADERS: list[tuple[bytes, bytes]] = [
        (b"x-content-type-options", b"nosniff"),
        (b"x-frame-options", b"DENY"),
        (b"referrer-policy", b"strict-origin-when-cross-origin"),
        (b"permissions-policy", b"camera=(), microphone=(), geolocation=()"),
        (b"strict-transport-security", b"max-age=31536000; includeSubDomains"),
        (b"content-security-policy", b"default-src 'none'"),
    ]

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_with_security_headers(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                headers.extend(self.SECURITY_HEADERS)
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, send_with_security_headers)
