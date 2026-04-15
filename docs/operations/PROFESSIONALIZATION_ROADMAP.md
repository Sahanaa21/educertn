# Professionalization Roadmap

This roadmap defines what remains to operate Educert as a stable, maintainable, self-hosted production system.

## Phase 0: Baseline Stability (Do First)

1. Keep `main` deployable at all times (green CI).
2. Treat lint warnings as debt and reduce them every week.
3. Enforce branch protection and PR review for all production changes.
4. Freeze direct server hotfixes; every change must flow through GitHub.

## Phase 1: Production Safety Controls

1. Finalize secrets inventory and ownership:
   - Database credentials
   - JWT secret
   - SMTP credentials
   - Payment provider keys (if enabled)
2. Configure daily PostgreSQL backups and weekly restore drill.
3. Configure uploads backup and retention policy.
4. Create a short on-call incident contact list in operations docs.

## Phase 2: Observability and Operations

1. Add uptime checks for frontend and backend endpoints.
2. Add centralized logs (PM2 logs + OS log rotation + archive policy).
3. Add weekly smoke test execution and review schedule.
4. Track key service metrics (error rate, request latency, disk usage, DB size).

## Phase 3: Release and Change Management

1. Use semantic version tags (`vX.Y.Z`) for releases.
2. Maintain release notes for every production deployment.
3. Require deployment checklist sign-off before go-live.
4. Define rollback SLA targets:
   - Detection to decision: <= 15 minutes
   - Decision to rollback complete: <= 20 minutes

## Phase 4: Security and Compliance Hardening

1. Rotate application secrets on a fixed cadence.
2. Run dependency audits daily and patch critical findings immediately.
3. Verify file upload validation and MIME checks quarterly.
4. Conduct quarterly access review for GitHub and server SSH access.

## Maintainer Weekly Routine

1. Review CI, health smoke, and security audit workflows.
2. Review open PRs and stale branches.
3. Verify latest backups and one sample restore in a non-production DB.
4. Close resolved incidents and update runbook notes.

## Definition of "Operationally Professional"

Educert is considered operationally professional when all of the following are true:

1. Every change is traceable from issue -> PR -> deployment.
2. Backups are automatic and restore-tested.
3. Alerts are actionable and on-call ownership is clear.
4. Rollback steps are rehearsed and time-bounded.
5. Security patching and access reviews are scheduled and documented.
