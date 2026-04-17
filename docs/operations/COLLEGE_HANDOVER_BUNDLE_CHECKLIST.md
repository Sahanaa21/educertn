# College Handover Bundle Checklist

Use this checklist when handing Educert to college IT.

## 1. Code and Documentation Bundle

1. Full repository with readable commit history.
2. Install guide: `docs/operations/WINDOWS_SERVER_DEMO_TO_PRODUCTION_GUIDE.md`.
3. Runbook: `docs/operations/OPERATIONS_RUNBOOK.md`.
4. Rollback playbook: `docs/operations/INCIDENT_ROLLBACK_PLAYBOOK.md`.
5. Release policy: `docs/operations/RELEASE_POLICY.md`.

## 2. Environment Templates (No Real Secrets)

1. `backend/.env.example` with all required keys.
2. `frontend/.env.example` with all required keys.
3. Confirm no real credentials are committed.

## 3. Server Prerequisites Confirmation

1. Windows 10/11 host is provisioned.
2. Node.js 20 LTS installed.
3. PostgreSQL 14+ installed and reachable.
4. Git installed.
5. Service manager decision made (PM2 or Task Scheduler/NSSM).

## 4. Network/Public Access Prerequisites

1. Public domain/subdomain allocated (example: `verify.college.edu`).
2. DNS `A` record mapped to college public IP.
3. Firewall rules approved for inbound 80/443.
4. Reverse proxy platform selected (IIS or NGINX).
5. TLS certificate issued and installed.

## 5. Demo Readiness Pack

1. Demo DB credentials prepared.
2. Demo SMTP credentials prepared (or local relay details).
3. Demo admin emails prepared for `ADMIN_BOOTSTRAP_EMAILS`.
4. Payment demo/sandbox values prepared (if payment flow demo is required).

## 6. Production Cutover Pack

1. Production DB credentials.
2. Production SMTP credentials.
3. Production secrets:
- `JWT_SECRET`
- `ISSUE_MAIL_ACTION_SECRET`
4. Public URL values finalized.
5. Production payment keys prepared (if enabled).

## 7. Acceptance Sign-off

1. Demo successfully executed end-to-end.
2. Public URL smoke-tested from external network.
3. Backup job tested.
4. Restore drill planned and owner assigned.
5. Named owners assigned for app, DB, and network operations.
