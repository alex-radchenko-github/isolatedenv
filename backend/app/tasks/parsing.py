"""Example parsing task with retry logic."""

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
def parse_new_data(self: celery.Task) -> None:
    """Parse new data from external source.

    Uses sync SQLAlchemy because Celery workers are synchronous.
    """
    logger.info("parsing_started", task_id=self.request.id)
    with SyncSession.begin() as session:
        # TODO: implement parsing logic
        pass
    logger.info("parsing_completed", task_id=self.request.id)
