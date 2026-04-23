"""Audit log -- data access layer."""

import uuid
from datetime import datetime

import sqlalchemy as sa
import structlog
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.models import AuditLog

logger = structlog.get_logger(__name__)


from app.core.database import escape_like


class AuditLogRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self,
        *,
        admin_user_id: uuid.UUID,
        admin_email: str,
        action: str,
        target_user_id: uuid.UUID,
        target_user_email: str,
        details: dict | None = None,
        ip_address: str | None = None,
    ) -> AuditLog:
        entry = AuditLog(
            admin_user_id=admin_user_id,
            admin_email=admin_email,
            action=action,
            target_user_id=target_user_id,
            target_user_email=target_user_email,
            details=details,
            ip_address=ip_address,
        )
        self.session.add(entry)
        await self.session.flush()
        await self.session.refresh(entry)
        logger.info(
            "audit_log_created",
            action=action,
            admin_user_id=str(admin_user_id),
            target_user_id=str(target_user_id),
        )
        return entry

    async def list_entries(
        self,
        *,
        action: str | None = None,
        search: str | None = None,
        offset: int = 0,
        limit: int = 20,
    ) -> list[AuditLog]:
        stmt = select(AuditLog)
        if action is not None:
            stmt = stmt.where(AuditLog.action == action)
        if search:
            pattern = f"%{escape_like(search)}%"
            stmt = stmt.where(
                or_(
                    AuditLog.admin_email.ilike(pattern),
                    AuditLog.target_user_email.ilike(pattern),
                ),
            )
        stmt = stmt.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def list_entries_cursor(
        self,
        *,
        action: str | None = None,
        search: str | None = None,
        cursor_created_at: datetime | None = None,
        cursor_id: uuid.UUID | None = None,
        limit: int = 20,
    ) -> list[AuditLog]:
        """Cursor-based pagination using (created_at, id) keyset.

        More efficient than OFFSET for large audit logs -- O(1) seek vs O(N) skip.
        Pass cursor_created_at and cursor_id from the last item of previous page.
        """
        stmt = select(AuditLog)
        if action is not None:
            stmt = stmt.where(AuditLog.action == action)
        if search:
            pattern = f"%{escape_like(search)}%"
            stmt = stmt.where(
                or_(
                    AuditLog.admin_email.ilike(pattern),
                    AuditLog.target_user_email.ilike(pattern),
                ),
            )
        if cursor_created_at is not None and cursor_id is not None:
            stmt = stmt.where(
                sa.tuple_(AuditLog.created_at, AuditLog.id)
                < sa.tuple_(cursor_created_at, cursor_id)
            )
        stmt = stmt.order_by(AuditLog.created_at.desc(), AuditLog.id.desc()).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_entries(
        self,
        *,
        action: str | None = None,
        search: str | None = None,
    ) -> int:
        stmt = select(func.count(AuditLog.id))
        if action is not None:
            stmt = stmt.where(AuditLog.action == action)
        if search:
            pattern = f"%{escape_like(search)}%"
            stmt = stmt.where(
                or_(
                    AuditLog.admin_email.ilike(pattern),
                    AuditLog.target_user_email.ilike(pattern),
                ),
            )
        result = await self.session.execute(stmt)
        return result.scalar_one()
