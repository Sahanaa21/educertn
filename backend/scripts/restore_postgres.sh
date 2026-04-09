#!/usr/bin/env bash
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required"
  exit 1
fi

if [ $# -lt 1 ]; then
  echo "Usage: ./scripts/restore_postgres.sh <backup_file.sql>"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found: $BACKUP_FILE"
  exit 1
fi

psql "$DATABASE_URL" -f "$BACKUP_FILE"

echo "Database restored from: $BACKUP_FILE"
