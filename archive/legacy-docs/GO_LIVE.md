# GO LIVE - Global Academy of Technology Portal

## 1) Pre-flight
- Ensure backend `.env` has:
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
  - Optional: `FRONTEND_URL`, `ADMIN_ALERT_EMAIL`
- Ensure frontend env has:
  - `NEXT_PUBLIC_API_BASE_URL` (example: `https://api.yourdomain.edu`)

## 2) Install and build
From repo root:
```bash
npm install
npm --prefix backend install
npm --prefix frontend install
npm run check
```

## 3) Database sync
```bash
npm --prefix backend exec prisma generate
npm --prefix backend exec prisma db push
npm --prefix backend exec tsx scripts/seedAdmin.ts
```

## 4) Run smoke tests
```bash
npm --prefix backend run test:verification
npm --prefix backend run test:issues
```

## 5) Start services
Backend:
```bash
npm run backend:start
```
Frontend:
```bash
npm run frontend:build
npm --prefix frontend start
```

## 6) Mandatory checks after deployment
- `/api/health` returns OK.
- Student login and request submit works.
- Company verification submit works.
- Admin login/dashboard/certificates/verifications/issues/settings works.
- OTP and issue-notification emails are delivered.

## 7) Rollback quick steps
- Revert to previous deployment artifact.
- Restore pre-deploy DB snapshot if schema/data rollback is needed.
- Verify `/api/health` and admin login.

## 8) Notes
- Maintenance mode is enforced globally from portal settings (`Admin > Settings`).
- Admin users can still access APIs during maintenance mode.
- Public/admin mutation APIs include basic rate limiting.
