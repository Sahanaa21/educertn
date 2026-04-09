# Operations Backup Guide

## Prerequisites
- `pg_dump` and `psql` must be installed on the machine running scripts.
- `DATABASE_URL` must point to the correct PostgreSQL database.

## Database Backup
```bash
cd backend
DATABASE_URL="postgres://..." npm run ops:backup:db
```

Default output location:
- `backend/backups/db_backup_YYYYMMDD_HHMMSS.sql`

## Database Restore
```bash
cd backend
DATABASE_URL="postgres://..." ./scripts/restore_postgres.sh ./backups/db_backup_YYYYMMDD_HHMMSS.sql
```

## Uploads Backup
```bash
cd backend
npm run ops:backup:uploads
```

Default output location:
- `backend/backups/uploads_backup_YYYYMMDD_HHMMSS.tar.gz`

## Recommended Schedule
- Database backup: daily
- Uploads backup: daily
- Restore drill to staging: monthly
