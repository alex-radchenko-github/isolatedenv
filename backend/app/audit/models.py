"""Audit log -- SQLAlchemy models."""

import uuid
from enum import StrEnum

from sqlalchemy import String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AuditAction(StrEnum):
    CHANGE_ROLE = "change_role"
    BLOCK_USER = "block_user"
    UNBLOCK_USER = "unblock_user"
    DELETE_USER = "delete_user"
    RESET_PASSWORD = "reset_password"
    DELETE_SELF = "delete_self"


class AuditLog(Base):
    """Persistent audit trail for admin actions. No FK to users -- survives user deletion.

    Audit entries are immutable -- no updated_at trigger exists on this table
    (column is inherited from Base but never modified by the DB).
    """

    __tablename__ = "audit_log"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )
    # Uses created_at from Base for the event timestamp (no separate timestamp column)
    admin_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, index=True,
    )
    admin_email: Mapped[str] = mapped_column(String(320), nullable=False)
    action: Mapped[str] = mapped_column(String(20), nullable=False)
    target_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, index=True,
    )
    target_user_email: Mapped[str] = mapped_column(String(320), nullable=False)
    details: Mapped[dict[str, object] | None] = mapped_column(JSONB, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
