"""User business logic layer."""

import base64
import binascii
import json
import uuid
from datetime import datetime

import httpx
import structlog

from app.core.config import settings
from app.core.exceptions import BusinessRuleError, NotFoundError
from app.users.models import User, UserRole
from app.users.repository import UserRepository
from app.users.schemas import (
    ChangeRoleResult,
    UserListResponse,
    UserMeResponse,
    UserResponse,
)

logger = structlog.get_logger(__name__)


class UserService:
    def __init__(self, repo: UserRepository) -> None:
        self.repo = repo

    async def get_me(self, user: User) -> UserMeResponse:
        return UserMeResponse.model_validate(user)

    async def get_user_by_id(self, user_id: uuid.UUID) -> User:
        user = await self.repo.get_by_id(user_id)
        if not user:
            raise NotFoundError(f"User {user_id} not found")
        return user

    async def change_role(
        self, target: User, new_role: UserRole, admin: User,
    ) -> ChangeRoleResult:
        if admin.id == target.id:
            raise BusinessRuleError("Cannot change your own role")
        old_role = target.role
        updated = await self.repo.update_role(
            target, new_role, changed_by=admin.provider_id,
        )
        return ChangeRoleResult(user=UserResponse.model_validate(updated), old_role=old_role)

    async def set_active(
        self, user_id: uuid.UUID, is_active: bool, admin: User,
    ) -> UserResponse:
        if admin.id == user_id:
            raise BusinessRuleError("Cannot block yourself")
        target = await self.get_user_by_id(user_id)
        updated = await self.repo.set_active(
            target, is_active, changed_by=admin.provider_id,
        )
        return UserResponse.model_validate(updated)

    async def delete_user(self, user_id: uuid.UUID, admin: User) -> None:
        if admin.id == user_id:
            raise BusinessRuleError("Cannot delete yourself")
        target = await self.get_user_by_id(user_id)
        await self.repo.delete_user(target)

    async def delete_self(self, user: User, http_client: httpx.AsyncClient) -> None:
        """Delete the current user's account.

        Order: PostgreSQL first (transactional, can rollback),
        then Authentik (best-effort, user already deleted from DB).
        """
        provider_id = user.provider_id
        user_id = str(user.id)

        # 1. Remove from PostgreSQL (transactional)
        await self.repo.delete_user(user)

        # 2. Remove from Authentik (best-effort)
        try:
            headers = {"Authorization": f"Bearer {settings.AUTHENTIK_API_TOKEN}"}
            # Resolve provider_id -> Authentik integer PK via search
            r = await http_client.get(
                f"{settings.AUTHENTIK_URL}/api/v3/core/users/",
                params={"search": provider_id},
                headers=headers,
            )
            r.raise_for_status()
            results = r.json().get("results", [])
            # Validate exact uid match -- search is fuzzy, must confirm uid
            ak_user = next(
                (u for u in results if str(u.get("uid", "")) == provider_id),
                None,
            )
            if ak_user is None:
                logger.warning(
                    "authentik_user_not_found",
                    provider_id=provider_id,
                )
                return
            ak_pk = ak_user["pk"]
            await http_client.delete(
                f"{settings.AUTHENTIK_URL}/api/v3/core/users/{ak_pk}/",
                headers=headers,
            )
        except (httpx.HTTPError, KeyError) as exc:
            logger.warning(
                "authentik_user_delete_failed",
                user_id=user_id,
                error=str(exc),
            )

    async def list_users(
        self,
        *,
        role: UserRole | None = None,
        is_active: bool | None = None,
        search: str | None = None,
        offset: int = 0,
        limit: int = 20,
    ) -> UserListResponse:
        # NOTE: list + count are two queries (not atomic). Acceptable for admin panel.
        # For strict consistency, combine with func.count().over() in a single query.
        users = await self.repo.list_users(
            role=role, is_active=is_active, search=search,
            offset=offset, limit=limit,
        )
        total = await self.repo.count_users(
            role=role, is_active=is_active, search=search,
        )
        return UserListResponse(
            users=[UserResponse.model_validate(u) for u in users],
            total=total,
            offset=offset,
            limit=limit,
        )

    async def list_users_cursor(
        self,
        *,
        role: UserRole | None = None,
        is_active: bool | None = None,
        search: str | None = None,
        cursor: str | None = None,
        limit: int = 20,
    ) -> tuple[list[User], str | None]:
        """List users with cursor-based (keyset) pagination.

        Returns (users, next_cursor). Cursor is an opaque base64 token
        encoding (created_at, id) of the last seen row.
        """
        cursor_created_at: datetime | None = None
        cursor_id: uuid.UUID | None = None

        if cursor:
            try:
                decoded = json.loads(base64.b64decode(cursor))
                cursor_created_at = datetime.fromisoformat(decoded["c"])
                cursor_id = uuid.UUID(decoded["i"])
            except (ValueError, KeyError, binascii.Error):
                pass

        # Fetch one extra row to detect whether a next page exists.
        users = await self.repo.list_users_cursor(
            role=role,
            is_active=is_active,
            search=search,
            cursor_created_at=cursor_created_at,
            cursor_id=cursor_id,
            limit=limit + 1,
        )

        has_more = len(users) > limit
        if has_more:
            users = users[:limit]

        next_cursor: str | None = None
        if has_more and users:
            last = users[-1]
            next_cursor = base64.b64encode(
                json.dumps({
                    "c": last.created_at.isoformat(),
                    "i": str(last.id),
                }).encode()
            ).decode()

        return users, next_cursor
