"""Celery configuration with Beat schedule and queue routing."""

from celery import Celery
from celery.schedules import crontab

from app.core.config import settings

celery_app = Celery(
    "worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_RESULT_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
    task_routes={
        "app.tasks.maintenance.*": {"queue": "maintenance"},
        "app.tasks.parsing.*": {"queue": "default"},
    },
)

celery_app.conf.beat_schedule = {
    "maintenance-cleanup-daily": {
        "task": "app.tasks.maintenance.cleanup_old_data",
        "schedule": crontab(hour=3, minute=0),
        "options": {"queue": "maintenance"},
    },
}

celery_app.autodiscover_tasks(["app.tasks"])
