#!/bin/bash
set -eo pipefail

# Graceful shutdown on SIGTERM/SIGINT (Docker stop, Kubernetes pod termination)
trap 'exit 0' SIGTERM SIGINT

# Validate required environment variables before startup
for var in DATABASE_URL DATABASE_URL_SYNC REDIS_URL AUTHENTIK_CLIENT_ID AUTHENTIK_CLIENT_SECRET JWKS_URL; do
    if [ -z "${!var}" ]; then
        echo "ERROR: Required environment variable $var is not set"
        exit 1
    fi
done

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL..."
for i in $(seq 1 30); do
    if python -c "
import os, sys
from sqlalchemy import create_engine, text
try:
    engine = create_engine(os.environ['DATABASE_URL_SYNC'])
    with engine.connect() as conn:
        conn.execute(text('SELECT 1'))
    engine.dispose()
    sys.exit(0)
except Exception:
    sys.exit(1)
" 2>/dev/null; then
        echo "PostgreSQL is ready!"
        break
    fi
    if [ "$i" -eq 30 ]; then
        echo "ERROR: PostgreSQL did not become ready in time"
        exit 1
    fi
    echo "  attempt $i/30..."
    sleep 2
done

echo "Running database migrations..."
alembic upgrade head

echo "Starting application..."
# Internal container port is always 8000. External mapping via docker-compose.
# WORKERS defaults to 1; set via environment for multi-worker production deployments.
WORKERS="${WORKERS:-1}"
exec uvicorn app.main:app --host "${API_HOST:-0.0.0.0}" --port 8000 --workers "$WORKERS" --timeout-graceful-shutdown 30
