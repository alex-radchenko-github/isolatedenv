"""CSRF protection via double-submit cookie pattern.

Cookie-based auth (session cookies from OIDC callback) requires CSRF protection.
Bearer token auth is exempt because the token itself proves intent.
"""

import secrets

from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.config import settings

CSRF_COOKIE = "csrf_token"
CSRF_HEADER = "x-csrf-token"
SAFE_METHODS = frozenset({"GET", "HEAD", "OPTIONS"})


class CSRFMiddleware:
    """Double-submit cookie CSRF protection.

    Sets a csrf_token cookie on every response.
    For unsafe methods (POST/PUT/DELETE/PATCH), validates that
    the X-CSRF-Token header matches the cookie value.

    Requests with Bearer token auth are exempt — the token itself
    cannot be read cross-origin, so CSRF is not applicable.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request = Request(scope, receive)

        # Skip CSRF for API routes that use Bearer token auth
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            await self.app(scope, receive, send)
            return

        if request.method not in SAFE_METHODS:
            cookie_token = request.cookies.get(CSRF_COOKIE)
            header_token = request.headers.get(CSRF_HEADER)

            if not cookie_token or not header_token or not secrets.compare_digest(cookie_token, header_token):
                response = JSONResponse(
                    status_code=403,
                    content={"detail": "CSRF token missing or invalid"},
                )
                await response(scope, receive, send)
                return

        # Inject CSRF cookie in response
        # Trade-off: reuse existing cookie for double-submit consistency.
        # Rotating on every response would break the pattern (client sends old
        # cookie in the header while the response sets a new one). Token is
        # only generated on the first visit (no cookie yet).
        async def send_with_csrf(message: Message) -> None:
            if message["type"] == "http.response.start":
                token = request.cookies.get(CSRF_COOKIE) or secrets.token_urlsafe(32)
                secure = "; Secure" if not settings.DEBUG else ""
                cookie = f"{CSRF_COOKIE}={token}; Path=/; SameSite=Strict; HttpOnly=false{secure}"
                headers = list(message.get("headers", []))  # type: ignore[arg-type]
                headers.append((b"set-cookie", cookie.encode()))
                message["headers"] = headers
            await send(message)  # type: ignore[arg-type]

        await self.app(scope, receive, send_with_csrf)
