"""Content endpoints -- role-gated stubs for demonstration."""

from pydantic import BaseModel
from fastapi import APIRouter, Request

from app.core.dependencies import CurrentUser, PaidUser
from app.core.rate_limit import limiter
from app.users.models import UserRole

router = APIRouter(prefix="/api/v1/content", tags=["content"])


class ContentResponse(BaseModel):
    """Response schema for content endpoints."""

    title: str
    body: str
    user_role: UserRole


@router.get("/free", response_model=ContentResponse)
@limiter.limit("60/minute")
async def free_content(request: Request, user: CurrentUser) -> ContentResponse:
    """Content available to all authenticated users."""
    return ContentResponse(
        title="Free Content",
        body="This content is available to all authenticated users.",
        user_role=user.role,
    )


@router.get("/paid", response_model=ContentResponse)
@limiter.limit("60/minute")
async def paid_content(request: Request, user: PaidUser) -> ContentResponse:
    """Content available only to paid and admin users."""
    return ContentResponse(
        title="Paid Content",
        body="This premium content is available to paid and admin users.",
        user_role=user.role,
    )
