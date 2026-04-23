"""Async SQLAlchemy engine and session factory."""

import re
from datetime import datetime

from sqlalchemy import DateTime, func
from sqlalchemy.ext.asyncio import AsyncAttrs, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from app.core.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=1800,
    pool_pre_ping=True,
    pool_use_lifo=True,
    # WARNING: logs SQL with parameter values -- ensure DEBUG=False in production
    echo=settings.DEBUG,
    connect_args={"server_settings": {"statement_timeout": "30000"}},
)

async_session = async_sessionmaker(engine, expire_on_commit=False)


def escape_like(s: str) -> str:
    """Escape special LIKE/ILIKE metacharacters (%, _, \\)."""
    return re.sub(r"([%_\\])", r"\\\1", s)


class Base(AsyncAttrs, DeclarativeBase):
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        # Managed by DB trigger (trg_<table>_updated_at), NOT by ORM onupdate
    )
