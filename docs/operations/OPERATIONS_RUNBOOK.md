# Operations Runbook

## Daily Checks
1. Check `/api/health/live` and `/api/health/ready`.
2. Review error logs for `ERROR` entries.
3. Confirm issue notifications and mail actions are working.
4. Verify pending critical issues queue.

## Weekly Checks
1. Run backup scripts for DB and uploads.
2. Run health smoke check against deployed API.
3. Review dependency alerts and update high-risk packages.
4. Validate disk usage and uploads growth trend.

## Monthly Checks
1. Perform restore drill to staging using latest DB dump.
2. Rotate operational secrets (SMTP, issue-mail action secret, JWT if possible).
3. Review admin/audit logs for unexpected actions.
4. Execute load smoke on top 3 APIs.

## Pre-Release Checklist
1. Pull latest `main` and confirm CI is green.
2. Run backend typecheck/build and frontend lint/build.
3. Verify env vars in target environment.
4. Deploy to staging first.
5. Execute smoke flows:
   - auth
   - certificate request
   - issue report + mail action
6. Deploy production.
7. Monitor logs for 30 minutes post-deploy.

## Emergency Contacts Matrix
1. Product owner: decides feature freeze and communication.
2. Developer on-call: applies rollback/hotfix.
3. Infra owner: scaling/network/database access.
4. Stakeholders: receives outage and recovery ETA updates.

## Tooling Commands
```bash
# backend checks
npm --prefix backend run typecheck
npm --prefix backend run build

# frontend checks
npm --prefix frontend run lint
npm --prefix frontend run build

# health smoke
npm --prefix backend run ops:health-smoke

# backups
npm --prefix backend run ops:backup:db
npm --prefix backend run ops:backup:uploads
```