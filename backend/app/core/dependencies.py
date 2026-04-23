"""FastAPI dependency injection helpers."""

from __future__ import annotations

from collections.abc import AsyncGenerator, Awaitable, Callable
from typing import Annotated

import httpx
import sqlalchemy.exc
import structlog
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import JWTPayload, get_current_user
from app.core.config import settings
from app.core.database import async_session
from app.users.models import User, UserRole
from app.users.repository import UserRepository
from app.users.utils import resolve_role

logger = structlog.get_logger(__name__)


def _get_http_client(request: Request) -> httpx.AsyncClient:
    """Get the shared httpx.AsyncClient from app state (created in lifespan)."""
    client: httpx.AsyncClient | None = getattr(request.app.state, "http_client", None)
    if client is None:
        raise RuntimeError("http_client not initialized -- check lifespan setup")
    return client


async def _fetch_userinfo(access_token: str, request: Request) -> dict[str, object]:
    """Fetch user profile from Authentik userinfo endpoint.

    Used as fallback when access token JWT doesn't contain
    email/name/groups claims (Authentik default behavior).
    """
    userinfo_url = f"{settings.AUTHENTIK_URL}/application/o/userinfo/"
    client = _get_http_client(request)
    r = await client.get(
        userinfo_url,
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=5.0,
    )
    if r.status_code == 200:
        data = r.json()
        if not isinstance(data, dict):
            logger.warning("userinfo_unexpected_type", type=type(data).__name__)
            return {}
        return data  # type: ignore[return-value]
    logger.warning(
        "userinfo_fetch_failed",
        status_code=r.status_code,
        url=userinfo_url,
    )
    return {}


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield an async database session with transaction, auto-commit on success."""
    async with async_session() as session:
        async with session.begin():
            yield session


async def get_current_db_user(
    request: Request,
    jwt_payload: JWTPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Resolve OIDC JWT claims -> PostgreSQL User (lazy upsert + sync).

    Standard OIDC claims used: sub, email, name, groups.
    Groups are mapped to roles: admins->admin, paid->paid, else free.

    Authentik groups are the single source of truth for roles.
    On every request the DB user's role is synced from JWT groups
    (DB role is a cache, not authoritative). Profile fields (email, name)
    are also kept in sync.

    Authentik access tokens may NOT contain profile claims (email, name, groups).
    When claims are missing, falls back to the userinfo endpoint.

    Fail-safe: DB unavailable -> 503, blocked user -> 403.
    """
    try:
        provider_id = str(jwt_payload.get("sub", ""))
        repo = UserRepository(db)

        email = str(jwt_payload.get("email", ""))
        name = str(jwt_payload.get("name", ""))
        raw_groups = jwt_payload.get("groups")
        groups = list(raw_groups) if isinstance(raw_groups, list) else None

        # Authentik access tokens often lack profile claims -- fetch from userinfo
        if not email:
            raw_token = str(jwt_payload.get("_raw_token", ""))
            userinfo = await _fetch_userinfo(raw_token, request)
            email = str(userinfo.get("email", ""))
            name = str(userinfo.get("name", name))
            raw_groups = userinfo.get("groups")
            groups = list(raw_groups) if isinstance(raw_groups, list) else groups
            logger.info("userinfo_fetched", email=email, name=name, groups=groups)

        # Resolve role from JWT groups (Authentik = source of truth)
        jwt_role = resolve_role(email, groups) if groups is not None else None

        # Fast path: read-only SELECT (no write transaction on every GET)
        user = await repo.get_by_provider_id(provider_id)

        if user is not None:
            # Existing user -- sync profile + role from JWT claims on every request.
            # Authentik groups are the single source of truth for roles;
            # DB role is a cache updated here to stay in sync.
            await repo.sync_from_jwt(
                user,
                email=email,
                name=name,
                role=jwt_role if jwt_role is not None else user.role,
            )
        elif email:
            # Check if user exists by email (e.g. seeded before first OIDC login)
            user = await repo.get_by_email(email)
            if user is not None:
                # Link existing user to OIDC provider (first OIDC login after seed)
                user.provider_id = provider_id
                user.name = name or user.name
                if jwt_role is not None:
                    user.role = jwt_role
                await db.flush()
                logger.info("user_linked_to_provider", provider_id=provider_id, email=email)
            else:
                # Brand new user -- upsert creates the local user record
                user = await repo.upsert_from_provider(
                    provider_id=provider_id,
                    email=email,
                    name=name,
                    groups=groups,
                )
        else:
            # No email and no existing user -- create with provider_id only
            user = await repo.upsert_from_provider(
                provider_id=provider_id,
                email=email,
                name=name,
                groups=groups,
            )
    except (sqlalchemy.exc.SQLAlchemyError, OSError) as exc:
        logger.error("db_user_sync_failed", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="User service temporarily unavailable",
        ) from exc

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is blocked",
        )

    return user


def require_role(*roles: UserRole) -> Callable[..., Awaitable[User]]:
    """Dependency factory: require one of the given roles. Admin always passes."""

    async def _check(user: User = Depends(get_current_db_user)) -> User:
        allowed = set(roles) | {UserRole.ADMIN}
        if user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return user

    return _check


# Type aliases for convenience in endpoint signatures
CurrentUser = Annotated[User, Depends(get_current_db_user)]
AdminUser = Annotated[User, Depends(require_role(UserRole.ADMIN))]
PaidUser = Annotated[User, Depends(require_role(UserRole.PAID))]
