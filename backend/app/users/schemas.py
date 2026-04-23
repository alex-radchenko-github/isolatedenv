"""User schemas for API responses and requests."""

import uuid
from datetime import datetime
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict

from app.users.models import UserRole

T = TypeVar("T", bound=BaseModel)


class UserMeResponse(BaseModel):
    """GET /api/v1/user/me -- current user profile."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    name: str
    role: UserRole
    is_active: bool
    created_at: datetime


class UserRoleResponse(BaseModel):
    """GET /api/v1/user/role -- quick role check."""

    role: UserRole


class UserResponse(BaseModel):
    """Admin view -- full user info."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    name: str
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: datetime


class UserRoleUpdate(BaseModel):
    """PATCH /api/v1/admin/users/{id}/role."""

    role: UserRole


class UserBlockUpdate(BaseModel):
    """PATCH /api/v1/admin/users/{id}/block."""

    is_active: bool


class UserListResponse(BaseModel):
    """Paginated list of users for admin."""

    users: list[UserResponse]
    total: int
    offset: int
    limit: int


class CursorPageMeta(BaseModel):
    """Metadata for cursor-based pagination."""

    has_more: bool
    next_cursor: str | None = None


class CursorPage(BaseModel, Generic[T]):
    """Cursor-based page response.

    More efficient than OFFSET for large datasets -- the client passes
    an opaque ``next_cursor`` token to fetch the next page.
    """

    items: list[T]
    meta: CursorPageMeta


class ResetPasswordResponse(BaseModel):
    """POST /api/v1/admin/users/{id}/reset-password."""

    temporary_password: str


class ChangeRoleResult(BaseModel):
    """Internal result from UserService.change_role carrying old_role."""

    user: UserResponse
    old_role: UserRole
