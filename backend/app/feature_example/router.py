"""Example feature -- API endpoints."""

import uuid

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.dependencies import get_db
from app.core.rate_limit import limiter
from app.feature_example.repository import ItemRepository
from app.feature_example.schemas import ItemCreate, ItemResponse, ItemUpdate
from app.feature_example.service import ItemService

router = APIRouter(prefix="/api/v1/items", tags=["example"])


def _get_service(db: AsyncSession = Depends(get_db)) -> ItemService:
    return ItemService(ItemRepository(db))


def _owner_id(user: dict[str, object] = Depends(get_current_user)) -> uuid.UUID:
    """Extract owner UUID from JWT ``sub`` claim."""
    return uuid.UUID(str(user["sub"]))


@router.get("", response_model=list[ItemResponse])
@limiter.limit("100/minute")
async def list_items(
    request: Request,
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    owner_id: uuid.UUID = Depends(_owner_id),
    service: ItemService = Depends(_get_service),
) -> list[ItemResponse]:
    return await service.list_items(owner_id=owner_id, offset=offset, limit=limit)


@router.get("/{item_id}", response_model=ItemResponse)
@limiter.limit("100/minute")
async def get_item(
    request: Request,
    item_id: uuid.UUID,
    owner_id: uuid.UUID = Depends(_owner_id),
    service: ItemService = Depends(_get_service),
) -> ItemResponse:
    return await service.get_item(item_id, owner_id)


@router.post("", response_model=ItemResponse, status_code=201)
@limiter.limit("30/minute")
async def create_item(
    request: Request,
    data: ItemCreate,
    owner_id: uuid.UUID = Depends(_owner_id),
    service: ItemService = Depends(_get_service),
) -> ItemResponse:
    return await service.create_item(data, owner_id)


@router.patch("/{item_id}", response_model=ItemResponse)
@limiter.limit("30/minute")
async def update_item(
    request: Request,
    item_id: uuid.UUID,
    data: ItemUpdate,
    owner_id: uuid.UUID = Depends(_owner_id),
    service: ItemService = Depends(_get_service),
) -> ItemResponse:
    return await service.update_item(item_id, data, owner_id)


@router.delete("/{item_id}", status_code=204)
@limiter.limit("30/minute")
async def delete_item(
    request: Request,
    item_id: uuid.UUID,
    owner_id: uuid.UUID = Depends(_owner_id),
    service: ItemService = Depends(_get_service),
) -> None:
    await service.delete_item(item_id, owner_id)
