"""Audit log -- business logic layer."""

import uuid

import sqlalchemy.exc
import structlog

from app.audit.models import AuditAction
from app.audit.repository import AuditLogRepository
from app.audit.schemas import AuditLogEntryResponse, AuditLogListResponse

logger = structlog.get_logger(__name__)


class AuditLogService:
    def __init__(self, repo: AuditLogRepository) -> None:
        self.repo = repo

    async def record(
        self,
        *,
        admin_user_id: uuid.UUID,
        admin_email: str,
        action: AuditAction,
        target_user_id: uuid.UUID,
        target_user_email: str,
        details: dict | None = None,
        ip_address: str | None = None,
    ) -> None:
        """Record an audit entry. Fire-and-forget: never blocks the main operation."""
        try:
            await self.repo.create(
                admin_user_id=admin_user_id,
                admin_email=admin_email,
                action=action.value,
                target_user_id=target_user_id,
                target_user_email=target_user_email,
                details=details,
                ip_address=ip_address,
            )
        except (sqlalchemy.exc.SQLAlchemyError, OSError):
            logger.error(
                "audit_log_record_failed",
                action=action.value,
                admin_user_id=str(admin_user_id),
                target_user_id=str(target_user_id),
                exc_info=True,
            )

    async def list_entries(
        self,
        *,
        action: str | None = None,
        search: str | None = None,
        offset: int = 0,
        limit: int = 20,
    ) -> AuditLogListResponse:
        entries = await self.repo.list_entries(
            action=action, search=search,
            offset=offset, limit=limit,
        )
        total = await self.repo.count_entries(
            action=action, search=search,
        )
        return AuditLogListResponse(
            entries=[AuditLogEntryResponse.model_validate(e) for e in entries],
            total=total,
            offset=offset,
            limit=limit,
        )
