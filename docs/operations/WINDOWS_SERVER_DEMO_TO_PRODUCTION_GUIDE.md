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

## Public Hosting (Internet Accessible)

This is the recommended production architecture to make Educert available publicly.

### Target Architecture

1. Public traffic enters on ports 80/443 to the college edge firewall.
2. Firewall/NAT forwards traffic to the Windows host running Educert.
3. Reverse proxy on Windows terminates HTTPS and routes:
- `/` to frontend on `127.0.0.1:3000`
- `/api` to backend on `127.0.0.1:5000`
- `/uploads` to backend on `127.0.0.1:5000/uploads`

### Step 1: Domain and DNS

1. Reserve a domain/subdomain, for example `verify.college.edu`.
2. Create DNS `A` record pointing to the college public IP.
3. Wait for DNS propagation and verify with:

```powershell
nslookup verify.college.edu
```

### Step 2: Firewall and Network

1. Allow inbound TCP 80 and 443 to the Windows host.
2. Keep ports 3000 and 5000 private (localhost/internal only).
3. If required by policy, restrict admin ports to VPN/internal IP ranges.

### Step 3: Reverse Proxy and TLS

Use one of these options.

#### Option A: IIS (college-managed certificate)

1. Enable IIS and URL Rewrite/ARR modules.
2. Bind HTTPS site for `verify.college.edu` using a college-issued certificate.
3. Configure reverse proxy rules:
- `/` -> `http://127.0.0.1:3000`
- `/api` -> `http://127.0.0.1:5000/api`
- `/uploads` -> `http://127.0.0.1:5000/uploads`

#### Option B: NGINX for Windows

Use this only if college policy allows NGINX service on Windows. Configure the same 3 proxy routes and TLS certificate.

### Step 4: Production Environment Values

Before opening to public, set these values:

In `backend/.env`:
- `NODE_ENV=production`
- `BASE_URL=https://verify.college.edu`
- `BACKEND_PUBLIC_URL=https://verify.college.edu`
- `BACKEND_URL=https://verify.college.edu`
- `FRONTEND_URL=https://verify.college.edu`
- `FRONTEND_URLS=https://verify.college.edu`

In `frontend/.env.local`:
- `NEXT_PUBLIC_API_BASE_URL=https://verify.college.edu`

Then rebuild and restart backend/frontend services.

### Step 5: Public Smoke Tests

1. Open `https://verify.college.edu` from an external network (not only LAN).
2. Verify health:
- `https://verify.college.edu/api/health/live`
- `https://verify.college.edu/api/health/ready`
3. Upload and access a sample file via `https://verify.college.edu/uploads/...`
4. Confirm browser shows valid HTTPS lock (no certificate warnings).

### Step 6: Go-Live Controls

1. Enable scheduled PostgreSQL and uploads backups.
2. Keep `.env` and `.env.local` readable only by service account/admins.
3. Keep Windows Update and Node.js LTS patching schedule.
4. Keep rollback plan ready (previous build + previous env snapshot).

## Hardening Notes

1. Keep `.env` and `.env.local` out of Git.
2. Restrict file system permissions to service account only.
3. Put a reverse proxy in front (IIS/NGINX) for TLS.
4. Enable regular PostgreSQL and uploads backup.
5. Test restore monthly.
