"""Example feature -- data access layer."""

import uuid

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.feature_example.models import Item
from app.feature_example.schemas import ItemCreate, ItemUpdate

logger = structlog.get_logger(__name__)


class ItemRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, item_id: uuid.UUID, owner_id: uuid.UUID) -> Item | None:
        stmt = select(Item).where(Item.id == item_id, Item.owner_id == owner_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_list(
        self, *, owner_id: uuid.UUID, offset: int = 0, limit: int = 20,
    ) -> list[Item]:
        stmt = (
            select(Item)
            .where(Item.owner_id == owner_id)
            .order_by(Item.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create(self, data: ItemCreate, owner_id: uuid.UUID) -> Item:
        item = Item(**data.model_dump(), owner_id=owner_id)
        self.session.add(item)
        await self.session.flush()
        await self.session.refresh(item)
        logger.info("item_created", item_id=str(item.id))
        return item

    async def update(self, item: Item, data: ItemUpdate) -> Item:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(item, field, value)
        await self.session.flush()
        await self.session.refresh(item)
        logger.info("item_updated", item_id=str(item.id))
        return item

    async def delete(self, item: Item) -> None:
        await self.session.delete(item)
        await self.session.flush()
        logger.info("item_deleted", item_id=str(item.id))
