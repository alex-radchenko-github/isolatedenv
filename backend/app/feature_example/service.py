"""Example feature -- business logic layer."""

import uuid

from app.core.cache import cached, invalidate
from app.core.exceptions import NotFoundError
from app.feature_example.repository import ItemRepository
from app.feature_example.schemas import ItemCreate, ItemResponse, ItemUpdate


class ItemService:
    def __init__(self, repo: ItemRepository) -> None:
        self.repo = repo

    async def get_item(self, item_id: uuid.UUID, owner_id: uuid.UUID) -> ItemResponse:
        item = await self.repo.get_by_id(item_id, owner_id)
        if not item:
            raise NotFoundError(f"Item {item_id} not found")
        return ItemResponse.model_validate(item)

    async def list_items(
        self, *, owner_id: uuid.UUID, offset: int = 0, limit: int = 20,
    ) -> list[ItemResponse]:
        async def _fetch() -> list[dict[str, object]]:
            items = await self.repo.get_list(owner_id=owner_id, offset=offset, limit=limit)
            return [ItemResponse.model_validate(i).model_dump() for i in items]

        result = await cached(f"items:{owner_id}:{offset}:{limit}", ttl=300, fetch_fn=_fetch)
        return [ItemResponse(**i) for i in result]

    async def create_item(self, data: ItemCreate, owner_id: uuid.UUID) -> ItemResponse:
        item = await self.repo.create(data, owner_id)
        await invalidate(f"items:{owner_id}:*")
        return ItemResponse.model_validate(item)

    async def update_item(
        self, item_id: uuid.UUID, data: ItemUpdate, owner_id: uuid.UUID,
    ) -> ItemResponse:
        item = await self.repo.get_by_id(item_id, owner_id)
        if not item:
            raise NotFoundError(f"Item {item_id} not found")
        updated = await self.repo.update(item, data)
        await invalidate(f"items:{owner_id}:*")
        return ItemResponse.model_validate(updated)

    async def delete_item(self, item_id: uuid.UUID, owner_id: uuid.UUID) -> None:
        item = await self.repo.get_by_id(item_id, owner_id)
        if not item:
            raise NotFoundError(f"Item {item_id} not found")
        await self.repo.delete(item)
        await invalidate(f"items:{owner_id}:*")
