"""Audit log -- Pydantic schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AuditLogEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    timestamp: datetime = Field(validation_alias="created_at")
    admin_user_id: uuid.UUID
    admin_email: str
    action: str
    target_user_id: uuid.UUID
    target_user_email: str
    details: dict | None = None
    ip_address: str | None = None


class AuditLogListResponse(BaseModel):
    entries: list[AuditLogEntryResponse]
    total: int
    offset: int
    limit: int
