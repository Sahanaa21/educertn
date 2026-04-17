# Windows 10/11 Demo-to-Production Install Guide

This guide is for college IT teams running Educert fully on college-managed infrastructure.

## Goal

1. Install and run a safe demo with non-real values.
2. Validate the full flow.
3. Replace only environment values with real credentials for go-live.

## Required Software

1. Node.js 20 LTS
2. PostgreSQL 14+
3. Git
4. Optional process manager: PM2 (`npm i -g pm2`)

## Required Project Layout on Server

Keep this structure as-is:

```text
educert/
  backend/
    src/
    prisma/
    scripts/
    uploads/
    .env
  frontend/
    src/
    public/
    .env.local
  docs/
  package.json
  README.md
```

Notes:
- Do not delete `backend/uploads/` because user files are stored there.
- Build output (`backend/index.js`, frontend `.next/`) is generated during install.
- `backend/dist/` can exist, but runtime uses `backend/index.js` from TypeScript build.

## Step 1: Clone and Install

Run from PowerShell:

```powershell
git clone <YOUR_REPO_URL> educert
cd educert

cd backend
npm install
cd ..

cd frontend
npm install
cd ..
```

## Step 2: Database Setup (PostgreSQL)

Create DB and user (example):

```sql
CREATE DATABASE educert;
CREATE USER educert_app WITH ENCRYPTED PASSWORD 'change_me';
GRANT ALL PRIVILEGES ON DATABASE educert TO educert_app;
```

Then apply schema (choose one):

1. Prisma push:

```powershell
cd backend
npx prisma db push
cd ..
```

2. Manual SQL:
- Run `backend/prisma/local_schema.sql` in PostgreSQL.

## Step 3: Configure Demo Environment Files

1. Copy templates:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env.local
```

2. Edit values for demo:
- Keep all keys.
- Use demo/local values only.
- Keep external observability disabled by leaving `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` blank.
- Keep payment values in demo/sandbox mode unless college wants payment testing.

## Step 4: Build and Start Demo

```powershell
cd backend
npm run build
npm start
```

Open a new PowerShell window:

```powershell
cd <PATH_TO_REPO>\educert\frontend
npm run build
npm start
```

Default URLs:
- Frontend: `http://127.0.0.1:3000`
- Backend: `http://127.0.0.1:5000/api/health`

## Step 5: Demo Validation Checklist

1. Backend health endpoint returns `ok`.
2. Frontend loads and can call backend API.
3. Login/admin bootstrap works with `ADMIN_BOOTSTRAP_EMAILS`.
4. Certificate upload/download flow works.
5. Verification flow works.
6. Issue reporting flow works.
7. Email flow works with college SMTP relay.

Optional smoke script:

```powershell
cd backend
npm run ops:health-smoke
```

## Step 6: Move from Demo to Real Values

After demo sign-off:

1. Update only values in `backend/.env` and `frontend/.env.local`.
2. Replace at minimum:
- `JWT_SECRET`
- `ISSUE_MAIL_ACTION_SECRET`
- DB credentials (`DB_*` or `DATABASE_URL`)
- URL values (`BASE_URL`, `BACKEND_PUBLIC_URL`, `FRONTEND_URL`, `NEXT_PUBLIC_API_BASE_URL`)
- SMTP credentials
- Payment credentials (if payment is enabled)

3. Rebuild and restart both services.

## Running as Services on Windows

### Option A: PM2

```powershell
cd backend
pm2 start ecosystem.config.js

cd ..\frontend
pm2 start npm --name educert-frontend -- start

pm2 save
```

### Option B: Windows Task Scheduler / NSSM

Use if PM2 is not allowed by policy. Register one process for backend and one for frontend, both with auto-start.

## Hardening Notes

1. Keep `.env` and `.env.local` out of Git.
2. Restrict file system permissions to service account only.
3. Put a reverse proxy in front (IIS/NGINX) for TLS.
4. Enable regular PostgreSQL and uploads backup.
5. Test restore monthly.
