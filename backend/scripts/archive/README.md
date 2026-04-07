# Archived Scripts and Fixtures

This folder contains legacy/manual test scripts and historical output fixtures.

## Why archived
- Not required for current CI-like smoke checks.
- Kept for reference/debug history.
- Excluded from normal release workflow.

## Active scripts to use
- `test_verification_api.js`
- `test_issue_reports.js`
- `cleanup_test_data.js`
- `cleanup_orphan_file_refs.js`
- `db_ping.js`
- `seedAdmin.ts`

If any archived script is needed again, move it back to `backend/scripts/` and document the reason.
