"""Audit log — API endpoints (admin-only)."""

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.repository import AuditLogRepository
from app.audit.schemas import AuditLogListResponse
from app.audit.service import AuditLogService
from app.core.dependencies import AdminUser, get_db
from app.core.rate_limit import limiter

router = APIRouter(prefix="/api/v1/admin/audit-log", tags=["admin"])


def _get_service(db: AsyncSession = Depends(get_db)) -> AuditLogService:
    return AuditLogService(AuditLogRepository(db))


@router.get("", response_model=AuditLogListResponse)
@limiter.limit("60/minute")
async def list_audit_log(
    request: Request,
    admin: AdminUser,
    action: str | None = None,
    search: str | None = Query(None, max_length=100),
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    service: AuditLogService = Depends(_get_service),
) -> AuditLogListResponse:
    """List audit log entries with filtering and pagination."""
    return await service.list_entries(
        action=action, search=search,
        offset=offset, limit=limit,
    )
