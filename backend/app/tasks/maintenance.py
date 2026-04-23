"""Maintenance tasks: cleanup, statistics updates."""

import celery
import sqlalchemy.exc
import structlog

from app.core.celery_app import celery_app
from app.core.sync_database import SyncSession

logger = structlog.get_logger(__name__)


@celery_app.task(
    bind=True,
    autoretry_for=(ConnectionError, TimeoutError, OSError, sqlalchemy.exc.OperationalError),
    retry_backoff=True,
    max_retries=5,
)
def cleanup_old_data(self: celery.Task) -> None:
    """Remove stale data and update statistics. Runs daily via Beat."""
    logger.info("cleanup_started", task_id=self.request.id)
    with SyncSession.begin() as session:
        # TODO: implement cleanup logic
        pass
    logger.info("cleanup_completed", task_id=self.request.id)
