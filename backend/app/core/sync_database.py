"""Synchronous SQLAlchemy engine for Celery tasks.

Celery workers are synchronous, so they need a sync engine.
Shared across all tasks to avoid per-task engine creation overhead.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

sync_engine = create_engine(
    settings.DATABASE_URL_SYNC,
    pool_size=3,
    max_overflow=5,
    pool_timeout=30,
    pool_recycle=1800,
    pool_pre_ping=True,
    pool_use_lifo=True,
    # If using pgbouncer (transaction mode), add: connect_args={"options": "-c statement_timeout=30000"}
)

SyncSession = sessionmaker(bind=sync_engine, expire_on_commit=False)
