# Dependabot Management Guide

This project uses Dependabot to automatically keep dependencies updated.

## Current Status

- **Backend (Node 20+)**: npm packages in `/backend`
- **Frontend (Next.js 16+)**: npm packages in `/frontend`
- **GitHub Actions**: Action versions in `.github/workflows/`

Dependabot creates pull requests weekly. College IT should review and merge them.

## Workflow

1. Review each PR for security/compatibility notes.
2. Merge PRs with passing CI (green checkmarks).
3. For failing PRs:
   - Check the CI failure details.
   - If it's a major version bump, test locally first before merging.
   - If incompatible, close the PR and re-open manually when compatible.

## Known Issues

### ESLint v10 Compatibility

The eslint v10.x upgrade PR may fail because `eslint-config-next` does not yet fully support v10.

**Status**: Keep on eslint v9 until `eslint-config-next` is updated.

**When compatible**: Update `frontend/package.json` `eslint` from `^9` to `^10` and merge.

## Auto-Merge (Optional)

To automatically merge safe updates:

1. GitHub Settings → Pull Requests → Enable "Auto-merge"
2. Allow Dependabot to auto-merge minor/patch updates for faster iteration

## Scheduled Audit

Dependabot runs security audits weekly. Check for critical/high vulnerabilities and prioritize those PRs.
