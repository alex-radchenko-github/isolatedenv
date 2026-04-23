"""OIDC JWT validation via PyJWT + JWKS (Authentik)."""

from __future__ import annotations

import asyncio
from concurrent.futures import ThreadPoolExecutor
from functools import lru_cache
from typing import TypedDict

import structlog
import jwt as pyjwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings

logger = structlog.get_logger(__name__)


class JWTPayload(TypedDict):
    """Typed representation of decoded OIDC JWT claims from Authentik.

    Standard OIDC claims used for user identification and role mapping.
    ``_raw_token`` is injected after decode for userinfo fallback.
    """

    sub: str
    email: str
    name: str
    groups: list[str]
    _raw_token: str

_bearer = HTTPBearer()
_bearer_optional = HTTPBearer(auto_error=False)


@lru_cache(maxsize=1)
def _get_jwks_client() -> PyJWKClient:
    """Lazy-initialize PyJWKClient on first use (not at import time).

    Caches the JWKS key set in-memory (lifespan=3600s).
    No Redis needed -- JWKS is a small static payload fetched once per hour.
    """
    return PyJWKClient(
        uri=settings.JWKS_URL,
        cache_jwk_set=True,
        lifespan=3600,
    )


@lru_cache(maxsize=1)
def _get_executor() -> ThreadPoolExecutor:
    """Lazy-initialize thread pool for JWKS HTTP calls.

    max_workers=2 is enough -- JWKS fetch is rare (once per cache miss).
    """
    return ThreadPoolExecutor(max_workers=2)


def _validate_jwt_sync(token: str) -> JWTPayload:
    """Validate JWT signature and claims using cached JWKS public keys.

    WARNING: This calls PyJWKClient.get_signing_key_from_jwt which uses
    urllib internally (synchronous HTTP). Must be called via run_in_executor
    from async context to avoid blocking the event loop on cache miss.

    Security: JWKS signature verification + audience + issuer check.
    Issuer is ALWAYS validated to prevent token confusion attacks.
    """
    jwks_client = _get_jwks_client()
    signing_key = jwks_client.get_signing_key_from_jwt(token)
    raw: dict[str, object] = pyjwt.decode(
        token,
        signing_key.key,
        algorithms=["RS256"],
        audience=settings.AUTHENTIK_CLIENT_ID,
        options={"verify_iss": True},
        issuer=settings.OIDC_ISSUER,
    )
    # Cast to JWTPayload -- claims may be missing from access tokens,
    # but downstream code handles absent keys via .get() with defaults.
    return raw  # type: ignore[return-value]


async def _validate_jwt(token: str) -> JWTPayload:
    """Async wrapper for JWT validation.

    Offloads to thread pool because PyJWKClient.get_signing_key_from_jwt
    uses synchronous urllib for JWKS fetch on cache miss.
    """
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_get_executor(), _validate_jwt_sync, token)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> JWTPayload:
    """Mandatory auth -- raises 401 if JWT is invalid.

    Returns decoded JWT payload with standard OIDC claims:
    - sub: user ID (provider_id)
    - email: user email
    - name: display name
    - preferred_username: username
    - groups: list of group names (for role mapping)
    """
    try:
        payload = await _validate_jwt(credentials.credentials)
        # Stash raw token for userinfo fallback (access tokens may lack profile claims)
        payload["_raw_token"] = credentials.credentials
        return payload
    except pyjwt.ExpiredSignatureError as exc:
        logger.warning("auth_token_expired")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        ) from exc
    except pyjwt.InvalidTokenError as exc:
        logger.warning("auth_failed", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from exc


async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_optional),
) -> JWTPayload | None:
    """Optional auth -- returns None if no token provided."""
    if credentials is None:
        return None
    try:
        return await _validate_jwt(credentials.credentials)
    except pyjwt.InvalidTokenError:
        return None
