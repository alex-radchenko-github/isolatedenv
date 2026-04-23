"""User utility functions (shared between service, repository, dependencies)."""

from app.core.config import settings
from app.users.models import UserRole


def resolve_role(email: str, groups: list[str] | None) -> UserRole:
    """Map Authentik groups to application role.

    Priority: admins group -> admin, paid group -> paid, else free.
    Fallback: ADMIN_EMAIL setting for admin role.

    This is a standalone function (not a method) because it is called
    from the service layer, repository layer, and dependencies layer
    without requiring a database session.
    """
    if groups:
        if "admins" in groups:
            return UserRole.ADMIN
        if "paid" in groups:
            return UserRole.PAID

    if settings.ADMIN_EMAIL and email.lower() == settings.ADMIN_EMAIL.lower():
        return UserRole.ADMIN

    return UserRole.FREE
