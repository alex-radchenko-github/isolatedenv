"""User data access layer."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

import structlog
import sqlalchemy as sa
from sqlalchemy import func, or_, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import escape_like
from app.users.models import User, UserRole

if TYPE_CHECKING:
    from sqlalchemy.sql import Select

logger = structlog.get_logger(__name__)


class UserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_provider_id(self, provider_id: str) -> User | None:
        stmt = select(User).where(User.provider_id == provider_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        stmt = select(User).where(User.email == email)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_id(self, user_id: uuid.UUID) -> User | None:
        return await self.session.get(User, user_id)

    async def upsert_from_provider(
        self,
        provider_id: str,
        email: str,
        name: str,
        groups: list[str] | None = None,
    ) -> User:
        """Idempotent upsert: create user on first API call, update on subsequent.

        Role is determined by Authentik groups (admins->admin, paid->paid,
        else free). Falls back to ADMIN_EMAIL check for admin role.
        On conflict the role IS overwritten -- Authentik groups are the
        single source of truth for roles (JWT groups -> DB cache).
        """
        from app.users.utils import resolve_role

        role = resolve_role(email, groups)

        stmt = (
            pg_insert(User)
            .values(
                provider_id=provider_id,
                email=email,
                name=name,
                role=role,
            )
            .on_conflict_do_update(
                index_elements=["provider_id"],
                set_={"email": email, "name": name, "role": role},
            )
            .returning(User)
        )
        result = await self.session.execute(stmt)
        user = result.scalar_one()
        await self.session.flush()
        await self.session.refresh(user)
        logger.info("user_upserted", provider_id=provider_id, role=user.role)
        return user

    async def sync_from_jwt(
        self,
        user: User,
        *,
        email: str,
        name: str,
        role: UserRole,
    ) -> None:
        """Sync profile and role from JWT claims (Authentik = source of truth).

        Called on every authenticated request for existing users.
        Only flushes when at least one field actually changed to avoid
        unnecessary write transactions on read-heavy endpoints.
        """
        changed = False
        if email and user.email != email:
            user.email = email
            changed = True
        if name and user.name != name:
            user.name = name
            changed = True
        if user.role != role:
            logger.info(
                "role_synced_from_jwt",
                user_id=str(user.id),
                old_role=user.role.value,
                new_role=role.value,
            )
            user.role = role
            changed = True
        if changed:
            await self.session.flush()

    async def update_role(
        self, user: User, new_role: UserRole, changed_by: str,
    ) -> User:
        user.role = new_role
        user.role_changed_at = datetime.now(timezone.utc)
        user.role_changed_by = changed_by
        await self.session.flush()
        await self.session.refresh(user)
        logger.info(
            "user_role_changed",
            user_id=str(user.id),
            new_role=new_role,
            changed_by=changed_by,
        )
        return user

    async def set_active(
        self, user: User, is_active: bool, changed_by: str,
    ) -> User:
        user.is_active = is_active
        user.role_changed_at = datetime.now(timezone.utc)
        user.role_changed_by = changed_by
        await self.session.flush()
        await self.session.refresh(user)
        logger.info(
            "user_active_changed",
            user_id=str(user.id),
            is_active=is_active,
            changed_by=changed_by,
        )
        return user

    async def delete_user(self, user: User) -> None:
        await self.session.delete(user)
        await self.session.flush()
        logger.info("user_deleted", user_id=str(user.id), email=user.email)

    @staticmethod
    def _apply_filters(
        stmt: Select[tuple[User]],
        *,
        role: UserRole | None = None,
        is_active: bool | None = None,
        search: str | None = None,
    ) -> Select[tuple[User]]:
        """Apply common WHERE clauses for user listing/counting."""
        if role is not None:
            stmt = stmt.where(User.role == role)
        if is_active is not None:
            stmt = stmt.where(User.is_active == is_active)
        if search:
            pattern = f"%{escape_like(search)}%"
            stmt = stmt.where(
                or_(User.email.ilike(pattern), User.name.ilike(pattern)),
            )
        return stmt

    async def list_users(
        self,
        *,
        role: UserRole | None = None,
        is_active: bool | None = None,
        search: str | None = None,
        offset: int = 0,
        limit: int = 20,
    ) -> list[User]:
        stmt = self._apply_filters(
            select(User), role=role, is_active=is_active, search=search,
        )
        stmt = stmt.order_by(User.created_at.desc()).offset(offset).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def list_users_cursor(
        self,
        *,
        role: UserRole | None = None,
        is_active: bool | None = None,
        search: str | None = None,
        cursor_created_at: datetime | None = None,
        cursor_id: uuid.UUID | None = None,
        limit: int = 20,
    ) -> list[User]:
        """Cursor-based pagination using (created_at, id) keyset.

        More efficient than OFFSET for large datasets -- O(1) seek vs O(N) skip.
        Pass cursor_created_at and cursor_id from the last item of previous page.
        """
        stmt = self._apply_filters(
            select(User), role=role, is_active=is_active, search=search,
        )
        if cursor_created_at is not None and cursor_id is not None:
            stmt = stmt.where(
                sa.tuple_(User.created_at, User.id)
                < sa.tuple_(cursor_created_at, cursor_id)
            )
        stmt = stmt.order_by(User.created_at.desc(), User.id.desc()).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_users(
        self,
        *,
        role: UserRole | None = None,
        is_active: bool | None = None,
        search: str | None = None,
    ) -> int:
        stmt = self._apply_filters(
            select(func.count(User.id)), role=role, is_active=is_active, search=search,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one()
