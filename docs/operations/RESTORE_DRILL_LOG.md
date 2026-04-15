# Restore Drill Log

Use this log to track backup restore verification in a non-production environment.

## Frequency

- Minimum: once per month
- Trigger additionally after major schema/data model changes

## Drill Template

| Date | Performed By | Backup Source | Target Environment | Duration | Result | Notes |
|---|---|---|---|---|---|---|
| YYYY-MM-DD | name | postgres dump + uploads | staging/local restore DB | 00:00 | PASS/FAIL | |

## Acceptance Criteria

1. Database restore completes without SQL errors.
2. Core tables contain expected row counts.
3. Uploaded files are readable after restore.
4. Health smoke against restored instance succeeds.
5. Any failure has a follow-up action owner and due date.

## Current Drill Records

| Date | Performed By | Backup Source | Target Environment | Duration | Result | Notes |
|---|---|---|---|---|---|---|
| 2026-04-15 | Maintainer | Initial self-hosted backup baseline | local restore rehearsal | TBD | PLANNED | First logged drill after migration cleanup |
