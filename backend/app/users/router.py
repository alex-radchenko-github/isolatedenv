"""User profile endpoints (replaces core/user_router)."""

import httpx
import structlog
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.models import AuditAction
from app.audit.repository import AuditLogRepository
from app.audit.service import AuditLogService
from app.core.dependencies import CurrentUser, _get_http_client, get_db
from app.core.rate_limit import limiter
from app.users.repository import UserRepository
from app.users.schemas import UserMeResponse, UserRoleResponse
from app.users.service import UserService

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/api/v1/user", tags=["user"])


# ── Service bundle for delete_self ─────────────────────────────────────────


class _SelfDeleteServices:
    """Bundles UserService and AuditLogService sharing a single DB session.

    Prevents the dual-session bug where delete_self uses two separate
    Depends(get_db) resulting in two independent transactions.
    """

    def __init__(
        self,
        db: AsyncSession = Depends(get_db),
        http_client: httpx.AsyncClient = Depends(_get_http_client),
    ) -> None:
        self.user = UserService(UserRepository(db))
        self.audit = AuditLogService(AuditLogRepository(db))
        self.http_client = http_client


@router.get("/me", response_model=UserMeResponse)
@limiter.limit("30/minute")
async def get_me(request: Request, user: CurrentUser) -> UserMeResponse:
    """Return the current authenticated user with role from PostgreSQL."""
    return UserMeResponse.model_validate(user)


@router.get("/role", response_model=UserRoleResponse)
@limiter.limit("60/minute")
async def get_role(request: Request, user: CurrentUser) -> UserRoleResponse:
    """Quick role check for frontend."""
    return UserRoleResponse(role=user.role)


@router.delete("/me", status_code=204)
@limiter.limit("5/minute")
async def delete_self(
    request: Request,
    user: CurrentUser,
    svc: _SelfDeleteServices = Depends(),
) -> None:
    """Delete the current user's account from PostgreSQL first, then Authentik."""
    user_id = user.id
    user_email = user.email

    await svc.user.delete_self(user, svc.http_client)

    await svc.audit.record(
        admin_user_id=user_id,
        admin_email=user_email,
        action=AuditAction.DELETE_SELF,
        target_user_id=user_id,
        target_user_email=user_email,
        ip_address=request.client.host if request.client else "unknown",
    )
