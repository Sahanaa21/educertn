#!/usr/bin/env bash
set -euo pipefail

UPLOADS_DIR="${UPLOADS_DIR:-./uploads}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"

if [ ! -d "$UPLOADS_DIR" ]; then
  echo "Uploads directory not found: $UPLOADS_DIR"
  exit 1
fi

mkdir -p "$BACKUP_DIR"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
ARCHIVE_FILE="$BACKUP_DIR/uploads_backup_${TIMESTAMP}.tar.gz"

tar -czf "$ARCHIVE_FILE" -C "$UPLOADS_DIR" .

echo "Uploads backup created: $ARCHIVE_FILE"
