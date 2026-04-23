#!/bin/bash
set -eo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
DB_NAME="isolatedenv"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_pre-migrate_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "Creating pre-migration backup..."
pg_dump "$DATABASE_URL_SYNC" | gzip > "$BACKUP_FILE"
echo "Backup saved to $BACKUP_FILE"

# Rotate: keep last 30 backups
find "$BACKUP_DIR" -name "*_pre-migrate_*" -mtime +30 -delete 2>/dev/null || true
