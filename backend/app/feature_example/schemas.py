"""Example feature -- Pydantic schemas."""

import uuid
from datetime import datetime
from typing import Self

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ItemCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=10_000)


class ItemUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=10_000)

    @model_validator(mode="after")
    def reject_empty_update(self) -> Self:
        """Reject updates where all fields are None (no-op)."""
        if self.title is None and self.description is None:
            raise ValueError("At least one field must be provided for update")
        return self


class ItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    description: str | None = None
    owner_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
