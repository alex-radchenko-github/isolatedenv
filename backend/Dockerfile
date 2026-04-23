# ── Stage 1: Install dependencies ──
FROM python:3.12-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ── Stage 2: Production runtime ──
FROM python:3.12-slim

LABEL org.opencontainers.image.title="isolatedenv" \
      org.opencontainers.image.description="My awesome project" \
      org.opencontainers.image.vendor="isolatedenv"

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

WORKDIR /app

COPY --from=builder /install /usr/local

# Copy files in order of change frequency (least -> most) for optimal layer caching
COPY --chown=appuser:appgroup alembic.ini .
COPY --chown=appuser:appgroup alembic/ alembic/
COPY --chown=appuser:appgroup entrypoint.sh .
COPY --chown=appuser:appgroup app/ app/

RUN chmod +x entrypoint.sh

# Celery Beat schedule directory (writable by appuser)
RUN mkdir -p /var/lib/celery && chown appuser:appgroup /var/lib/celery

HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=15s \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health/live', timeout=5)" || exit 1

USER appuser
EXPOSE 8000
CMD ["./entrypoint.sh"]
