"""Admin-only user management endpoints."""

import ipaddress
import secrets
import uuid
from typing import Annotated

import httpx
import structlog
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.models import AuditAction
from app.audit.repository import AuditLogRepository
from app.audit.service import AuditLogService
from app.core.config import settings
from app.core.dependencies import AdminUser, _get_http_client, get_db
from app.core.exceptions import BusinessRuleError
from app.core.rate_limit import limiter
from app.users.models import UserRole
from app.users.repository import UserRepository
from app.users.schemas import (
    CursorPage,
    CursorPageMeta,
    ResetPasswordResponse,
    UserBlockUpdate,
    UserListResponse,
    UserResponse,
    UserRoleUpdate,
)
from app.users.service import UserService

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/api/v1/admin/users", tags=["admin"])

HttpClient = Annotated[httpx.AsyncClient, Depends(_get_http_client)]


# ── Authentik Admin API helpers ─────────────────────────────────────────────


def _authentik_headers() -> dict[str, str]:
    """Build Authorization headers for Authentik Admin API."""
    if not settings.AUTHENTIK_API_TOKEN:
        raise BusinessRuleError(
            "AUTHENTIK_API_TOKEN is not configured. "
            "Set it in .env or as an environment variable."
        )
    return {"Authorization": f"Bearer {settings.AUTHENTIK_API_TOKEN}"}


async def _authentik_set_password(
    client: httpx.AsyncClient, provider_id: str, password: str,
) -> None:
    """Set user password via Authentik Admin API."""
    user_pk = await _authentik_get_user_pk(client, provider_id)
    url = f"{settings.AUTHENTIK_URL}/api/v3/core/users/{user_pk}/set_password/"
    resp = await client.post(
        url,
        json={"password": password},
        headers=_authentik_headers(),
    )
    resp.raise_for_status()


async def _authentik_delete_user(
    client: httpx.AsyncClient, provider_id: str,
) -> None:
    """Delete user via Authentik Admin API."""
    user_pk = await _authentik_get_user_pk(client, provider_id)
    url = f"{settings.AUTHENTIK_URL}/api/v3/core/users/{user_pk}/"
    resp = await client.delete(url, headers=_authentik_headers())
    resp.raise_for_status()


# ── Authentik Group management (roles via groups) ─────────────────────────

ROLE_TO_GROUP: dict[UserRole, str] = {
    UserRole.ADMIN: "admins",
    UserRole.PAID: "paid",
    UserRole.FREE: "free",
}


async def _authentik_get_user_pk(
    client: httpx.AsyncClient, provider_id: str,
) -> int:
    """Resolve JWT ``sub`` (provider_id) to Authentik integer PK.

    Authentik group membership API requires integer PK.  The JWT ``sub``
    claim is an opaque identifier (depends on sub_mode) that doesn't
    match the Authentik REST path ``/core/users/{pk}/``.  We search
    by provider_id instead and validate exact match on ``uid``.
    """
    url = f"{settings.AUTHENTIK_URL}/api/v3/core/users/"
    resp = await client.get(
        url,
        params={"search": provider_id},
        headers=_authentik_headers(),
    )
    resp.raise_for_status()
    results = resp.json().get("results", [])
    if not results:
        raise BusinessRuleError(
            f"User with provider_id {provider_id} not found in Authentik"
        )
    # Validate exact match -- search is fuzzy, must confirm uid
    for user in results:
        if str(user.get("uid", "")) == provider_id:
            return user["pk"]
    raise BusinessRuleError(
        f"User with provider_id {provider_id} not found in Authentik (no exact uid match)"
    )


async def _authentik_get_group_pk(
    client: httpx.AsyncClient, group_name: str,
) -> str:
    """Look up Authentik group PK by name."""
    url = f"{settings.AUTHENTIK_URL}/api/v3/core/groups/"
    resp = await client.get(
        url, params={"name": group_name}, headers=_authentik_headers(),
    )
    resp.raise_for_status()
    for g in resp.json().get("results", []):
        if g.get("name") == group_name:
            return g["pk"]
    raise BusinessRuleError(f"Group '{group_name}' not found in Authentik")


async def _authentik_change_group(
    client: httpx.AsyncClient,
    provider_id: str,
    old_role: UserRole,
    new_role: UserRole,
) -> None:
    """Move user between Authentik groups (source of truth for roles).

    Authentik groups are the single source of truth for application roles.
    This function removes the user from the old role's group and adds
    them to the new role's group.
    """
    user_pk = await _authentik_get_user_pk(client, provider_id)
    old_group_pk = await _authentik_get_group_pk(client, ROLE_TO_GROUP[old_role])
    new_group_pk = await _authentik_get_group_pk(client, ROLE_TO_GROUP[new_role])

    # Remove from old group (idempotent: 204 success, 404 not in group)
    resp = await client.post(
        f"{settings.AUTHENTIK_URL}/api/v3/core/groups/{old_group_pk}/remove_user/",
        json={"pk": user_pk},
        headers=_authentik_headers(),
    )
    if resp.status_code not in (200, 204, 404):
        resp.raise_for_status()

    # Add to new group
    resp = await client.post(
        f"{settings.AUTHENTIK_URL}/api/v3/core/groups/{new_group_pk}/add_user/",
        json={"pk": user_pk},
        headers=_authentik_headers(),
    )
    resp.raise_for_status()

    logger.info(
        "authentik_group_changed",
        provider_id=provider_id,
        old_group=ROLE_TO_GROUP[old_role],
        new_group=ROLE_TO_GROUP[new_role],
    )


# ── Service bundle ──────────────────────────────────────────────────────────


class _Services:
    """Bundles UserService and AuditLogService sharing a single DB session."""

    def __init__(self, user: UserService, audit: AuditLogService) -> None:
        self.user = user
        self.audit = audit


def _get_services(db: AsyncSession = Depends(get_db)) -> _Services:
    """Create both services from a single session to guarantee transactional consistency."""
    return _Services(
        user=UserService(UserRepository(db)),
        audit=AuditLogService(AuditLogRepository(db)),
    )


Services = Annotated[_Services, Depends(_get_services)]


def _get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        # Take the LAST entry -- added by the trusted reverse proxy closest to the app.
        # The first entry can be trivially spoofed by the client.
        candidate = forwarded.split(",")[-1].strip()
        try:
            ipaddress.ip_address(candidate)
            return candidate
        except ValueError:
            pass
    return request.client.host if request.client else "unknown"


@router.get("", response_model=UserListResponse)
@limiter.limit("60/minute")
async def list_users(
    request: Request,
    admin: AdminUser,
    svc: Services,
    role: UserRole | None = None,
    is_active: bool | None = None,
    search: str | None = Query(None, max_length=100),
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
) -> UserListResponse:
    """List all users with filtering and offset-based pagination (v1)."""
    return await svc.user.list_users(
        role=role, is_active=is_active, search=search,
        offset=offset, limit=limit,
    )


@router.get("/v2", response_model=CursorPage[UserResponse])
@limiter.limit("60/minute")
async def list_users_v2(
    request: Request,
    admin: AdminUser,
    svc: Services,
    role: UserRole | None = None,
    is_active: bool | None = None,
    search: str | None = Query(None, max_length=100),
    cursor: str | None = Query(None, max_length=500),
    limit: int = Query(20, ge=1, le=100),
) -> CursorPage[UserResponse]:
    """List users with cursor-based (keyset) pagination (v2).

    More efficient than OFFSET for large datasets -- O(1) seek vs O(N) skip.
    Pass the ``next_cursor`` from the previous response to fetch the next page.
    """
    users, next_cursor = await svc.user.list_users_cursor(
        role=role, is_active=is_active, search=search,
        cursor=cursor, limit=limit,
    )
    return CursorPage[UserResponse](
        items=[UserResponse.model_validate(u) for u in users],
        meta=CursorPageMeta(
            has_more=next_cursor is not None,
            next_cursor=next_cursor,
        ),
    )


@router.patch("/{user_id}/role", response_model=UserResponse)
@limiter.limit("30/minute")
async def change_role(
    request: Request,
    user_id: uuid.UUID,
    body: UserRoleUpdate,
    admin: AdminUser,
    svc: Services,
    http_client: HttpClient,
) -> UserResponse:
    """Change a user's role. Authentik-first: update group, then DB cache.

    1. Fetch target user (validate self-change, get current role)
    2. Change Authentik group membership (source of truth)
    3. Update DB role as cache for immediate UI feedback
    4. Record audit log

    If Authentik API fails, no DB change happens -- the error propagates.
    If Authentik OK but DB fails, the next JWT-bearing request will
    sync the DB automatically via get_current_db_user.
    """
    # Fetch target and validate (self-role-change guard is in service)
    target = await svc.user.get_user_by_id(user_id)
    old_role = target.role

    # 1. Authentik = source of truth -> change group FIRST
    await _authentik_change_group(http_client, target.provider_id, old_role, body.role)

    # 2. DB = cache -> update immediately for UI feedback
    # Pass already-fetched target to avoid double fetch
    result = await svc.user.change_role(target, body.role, admin)

    # 3. Audit
    await svc.audit.record(
        admin_user_id=admin.id,
        admin_email=admin.email,
        action=AuditAction.CHANGE_ROLE,
        target_user_id=user_id,
        target_user_email=result.user.email,
        details={
            "old_role": old_role.value,
            "new_role": body.role.value,
            "authentik_synced": True,
        },
        ip_address=_get_client_ip(request),
    )
    return result.user


@router.patch("/{user_id}/block", response_model=UserResponse)
@limiter.limit("30/minute")
async def block_user(
    request: Request,
    user_id: uuid.UUID,
    body: UserBlockUpdate,
    admin: AdminUser,
    svc: Services,
) -> UserResponse:
    """Block or unblock a user. Admin cannot block themselves."""
    result = await svc.user.set_active(user_id, body.is_active, admin)
    await svc.audit.record(
        admin_user_id=admin.id,
        admin_email=admin.email,
        action=AuditAction.UNBLOCK_USER if body.is_active else AuditAction.BLOCK_USER,
        target_user_id=user_id,
        target_user_email=result.email,
        ip_address=_get_client_ip(request),
    )
    return result


@router.post("/{user_id}/reset-password", response_model=ResetPasswordResponse)
@limiter.limit("10/minute")
async def reset_password(
    request: Request,
    user_id: uuid.UUID,
    admin: AdminUser,
    svc: Services,
    http_client: HttpClient,
) -> ResetPasswordResponse:
    """Reset a user's password via Authentik Admin API. Returns generated password."""
    target = await svc.user.get_user_by_id(user_id)

    new_password = secrets.token_urlsafe(12)

    await _authentik_set_password(http_client, target.provider_id, new_password)

    await svc.audit.record(
        admin_user_id=admin.id,
        admin_email=admin.email,
        action=AuditAction.RESET_PASSWORD,
        target_user_id=target.id,
        target_user_email=target.email,
        ip_address=_get_client_ip(request),
    )

    return ResetPasswordResponse(temporary_password=new_password)


@router.delete("/{user_id}", status_code=204)
@limiter.limit("10/minute")
async def delete_user(
    request: Request,
    user_id: uuid.UUID,
    admin: AdminUser,
    svc: Services,
    http_client: HttpClient,
) -> None:
    """Delete a user from PostgreSQL and Authentik.

    Order: PG delete + audit first (transactional), then Authentik delete (best-effort).
    If Authentik fails, the user is already removed from PG so they can't log in
    (upsert would recreate a fresh record, but the old data is gone).
    """
    # Fetch target (service.delete_user validates self-deletion)
    target = await svc.user.get_user_by_id(user_id)

    # Save target info before deletion (ORM object becomes detached after commit)
    target_id = target.id
    target_email = target.email
    target_provider_id = target.provider_id

    # 1. Remove from PostgreSQL + audit in one transaction
    await svc.user.delete_user(target.id, admin)
    await svc.audit.record(
        admin_user_id=admin.id,
        admin_email=admin.email,
        action=AuditAction.DELETE_USER,
        target_user_id=target_id,
        target_user_email=target_email,
        ip_address=_get_client_ip(request),
    )

    # 2. Remove from Authentik (best-effort, PG is already consistent)
    try:
        await _authentik_delete_user(http_client, target_provider_id)
    except Exception:
        logger.warning(
            "authentik_user_delete_failed",
            user_id=str(user_id),
            provider_id=target_provider_id,
            exc_info=True,
        )
