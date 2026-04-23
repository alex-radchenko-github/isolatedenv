"""isolatedenv -- FastAPI application."""

import asyncio
import ipaddress
import sys
import time
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import httpx
import structlog
from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from slowapi.errors import RateLimitExceeded
from sqlalchemy import text
from starlette.types import ASGIApp, Receive, Scope, Send

from app.core.config import settings
from app.core.csrf import CSRFMiddleware
from app.core.database import async_session, engine
from app.core.exceptions import AppError
from app.core.logging import setup_logging
from app.core.metrics import metrics_endpoint
from app.core.middleware import RequestIDMiddleware, SecurityHeadersMiddleware
from app.core.rate_limit import limiter
from app.core.redis import redis_client
from app.core.celery_app import celery_app
from app.audit.router import router as audit_router
from app.content.router import router as content_router
from app.feature_example.router import router as example_router
from app.users.admin_router import router as admin_router
from app.users.router import router as user_router

logger = structlog.get_logger(__name__)

# Security headers applied to error responses (exception handlers bypass ASGI middleware).
SECURITY_HEADERS: dict[str, str] = {
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "strict-origin-when-cross-origin",
    "strict-transport-security": "max-age=31536000; includeSubDomains",
}

MAX_CONTENT_SIZE = 10_485_760  # 10 MB

# Internal (private) IP networks for endpoint access control.
_INTERNAL_NETWORKS = (
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("::1/128"),
)


def _is_internal_ip(host: str) -> bool:
    """Check if *host* belongs to a private/loopback network."""
    try:
        addr = ipaddress.ip_address(host)
        return any(addr in net for net in _INTERNAL_NETWORKS)
    except ValueError:
        return False


async def _require_internal(request: Request) -> None:
    """Dependency that restricts access to internal networks only.

    Used on operational endpoints (/metrics, /health/info, /health/celery)
    to prevent public exposure of internal details.
    """
    client_host = request.client.host if request.client else "unknown"
    if not _is_internal_ip(client_host):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Endpoint restricted to internal networks",
        )


class ContentSizeLimitMiddleware:
    """Reject requests with Content-Length exceeding the configured limit.

    Pure ASGI implementation -- checks the Content-Length header before
    passing the request to the application. Requests without Content-Length
    are allowed through (chunked transfers are handled by uvicorn).
    """

    def __init__(self, app: ASGIApp, max_content_size: int = MAX_CONTENT_SIZE) -> None:
        self.app = app
        self.max_content_size = max_content_size

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        content_length = 0
        for header_name, header_value in scope.get("headers", []):
            if header_name == b"content-length":
                content_length = int(header_value)
                break
        if content_length > self.max_content_size:
            response = JSONResponse(
                status_code=413,
                content={"detail": "Request body too large"},
                headers=SECURITY_HEADERS,
            )
            await response(scope, receive, send)
            return
        await self.app(scope, receive, send)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Startup
    setup_logging(debug=settings.DEBUG)

    # Sentry (optional -- only if DSN is configured)
    if settings.SENTRY_DSN:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration

        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            traces_sample_rate=0.1,
            integrations=[FastApiIntegration()],
        )

    app.state.http_client = httpx.AsyncClient(timeout=10)
    app.state.start_time = time.monotonic()
    await redis_client.ping()
    logger.info("application_started")
    yield
    # Shutdown
    await app.state.http_client.aclose()
    await redis_client.close()
    await engine.dispose()
    logger.info("application_stopped")


app = FastAPI(
    title="isolatedenv",
    description="My awesome project",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
)

# Rate limiting
app.state.limiter = limiter


async def _rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Return JSON (not PlainText) for rate limit errors to keep API response format consistent."""
    return JSONResponse(
        status_code=429,
        content={"detail": "Rate limit exceeded"},
        headers=SECURITY_HEADERS,
    )


app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Middleware order: add_middleware builds an onion -- last added is outermost.
# Execution order: RequestID -> SecurityHeaders -> ContentSizeLimit -> CORS -> CSRF -> app
app.add_middleware(CSRFMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-CSRF-Token"],
    max_age=86400,  # 24h -- safe for stable APIs; reduce if CORS policy changes frequently
)
app.add_middleware(ContentSizeLimitMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestIDMiddleware)

# All routers define their full prefix internally
app.include_router(example_router)
app.include_router(user_router)
app.include_router(admin_router)
app.include_router(audit_router)
app.include_router(content_router)


# Prometheus metrics endpoint -- scraped by Prometheus, not part of the API.
@app.get("/metrics", include_in_schema=False, dependencies=[Depends(_require_internal)])
async def metrics(request: Request) -> JSONResponse:
    """Proxy to Prometheus metrics endpoint (internal-only)."""
    return await metrics_endpoint(request)


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    """Convert domain exceptions into structured JSON responses."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=SECURITY_HEADERS,
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error("unhandled_exception", path=request.url.path, exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
        headers=SECURITY_HEADERS,
    )


# ---------------------------------------------------------------------------
# Health check schemas & endpoints
# ---------------------------------------------------------------------------


class HealthStatus(BaseModel):
    """Liveness probe response."""

    status: str


class ReadinessStatus(BaseModel):
    """Readiness probe response with dependency checks."""

    status: str
    redis: str
    database: str
    authentik: str


@app.get("/health/live", response_model=HealthStatus)
async def health_live() -> HealthStatus:
    """Liveness probe -- always returns 200 if the process is running.

    Use for Docker HEALTHCHECK and Kubernetes livenessProbe.
    No dependency checks -- avoids cascading restarts when a backend is down.
    """
    return HealthStatus(status="ok")


@app.get("/health/ready")
async def health_ready() -> JSONResponse:
    """Readiness probe -- checks all dependencies.

    Use for load balancer health checks and Kubernetes readinessProbe.
    Returns 503 if any dependency is unavailable.
    """
    return await _check_readiness()


@app.get("/health")
async def health() -> JSONResponse:
    """Backward-compatible alias for /health/ready."""
    return await _check_readiness()


async def _check_readiness() -> JSONResponse:
    """Full readiness check: Redis, PostgreSQL, Authentik."""
    # Redis check
    try:
        await redis_client.ping()
        redis_ok = True
    except Exception:
        redis_ok = False

    # PostgreSQL check
    try:
        async with async_session() as session:
            await session.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    # Authentik check
    try:
        client = app.state.http_client
        r = await client.get(f"{settings.AUTHENTIK_URL}/-/health/live/")
        authentik_ok = r.status_code < 500
    except Exception:
        authentik_ok = False

    all_ok = redis_ok and db_ok and authentik_ok
    status_code = 200 if all_ok else 503
    return JSONResponse(
        status_code=status_code,
        content={
            "status": "ok" if all_ok else "degraded",
            "redis": "ok" if redis_ok else "error",
            "database": "ok" if db_ok else "error",
            "authentik": "ok" if authentik_ok else "error",
        },
    )


# ---------------------------------------------------------------------------
# System info & Celery health (internal-only)
# ---------------------------------------------------------------------------


class SystemInfo(BaseModel):
    """System versions and uptime for the dashboard info widget."""

    app_version: str
    python_version: str
    postgresql_version: str
    redis_version: str
    uptime_seconds: float


@app.get(
    "/health/info",
    response_model=SystemInfo,
    dependencies=[Depends(_require_internal)],
)
async def health_info() -> SystemInfo:
    """System info endpoint -- versions and uptime. Internal networks only."""
    # PostgreSQL version
    pg_version = "unavailable"
    try:
        async with async_session() as session:
            result = await session.execute(text("SHOW server_version"))
            row = result.scalar_one_or_none()
            if row:
                pg_version = str(row)
    except Exception:
        pass

    # Redis version
    redis_version = "unavailable"
    try:
        info = await redis_client.info("server")
        redis_version = info.get("redis_version", "unavailable")
    except Exception:
        pass

    # Uptime
    uptime = time.monotonic() - getattr(app.state, "start_time", time.monotonic())

    return SystemInfo(
        app_version=app.version,
        python_version=f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
        postgresql_version=pg_version,
        redis_version=redis_version,
        uptime_seconds=round(uptime, 1),
    )


class CeleryStatus(BaseModel):
    """Celery worker health status."""

    status: str
    workers: list[str]


@app.get(
    "/health/celery",
    response_model=CeleryStatus,
    dependencies=[Depends(_require_internal)],
)
async def health_celery() -> CeleryStatus:
    """Celery worker health check. Internal networks only.

    Runs inspect.ping() in a thread to avoid blocking the event loop.
    Times out after 3 seconds if no workers respond.
    """
    try:
        loop = asyncio.get_running_loop()
        result = await asyncio.wait_for(
            loop.run_in_executor(None, lambda: celery_app.control.inspect().ping()),
            timeout=3.0,
        )
        if result:
            return CeleryStatus(status="ok", workers=list(result.keys()))
        return CeleryStatus(status="error", workers=[])
    except Exception:
        return CeleryStatus(status="error", workers=[])
