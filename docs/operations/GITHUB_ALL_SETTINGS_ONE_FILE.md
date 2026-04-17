# GitHub All Settings (Single-File Checklist)

Use this as the single source of truth for GitHub repository settings for Educert.

Applies to: main production repository.

## 1) Repository Visibility and Access

1. Repository visibility: `Private` (recommended for college/internal operations).
2. Keep public app hosting separate from repo visibility.
3. Access model:
- Owners: admin
- Maintainers: write + PR review
- Others: read
4. Do not use shared credentials.

## 2) Branch Protection (main)

GitHub path:
`Settings -> Branches -> Branch protection rules -> Add rule`.

Set rule for branch name pattern: `main`.

Enable:
1. Require a pull request before merging.
2. Require approvals: minimum `1`.
3. Dismiss stale pull request approvals when new commits are pushed.
4. Require review from Code Owners.
5. Require status checks to pass before merging.
6. Require branches to be up to date before merging.
7. Require conversation resolution before merging.
8. Require linear history.
9. Include administrators.

Required status checks (exact names from workflows):
1. `Backend Checks`
2. `Frontend Checks`

Disable:
1. Allow force pushes.
2. Allow deletions.

Important:
- Do not require `Validate Before Release` on `main` because it runs on tags/manual release workflow, not PRs to `main`.

## 3) Pull Request and Merge Strategy

GitHub path:
`Settings -> General -> Pull Requests`.

Enable:
1. Automatically delete head branches.
2. Allow squash merging.

Disable:
1. Allow merge commits.
2. Allow rebase merging (optional, keep off for strict linear + squash workflow).

## 4) Actions Security and Policy

GitHub path:
`Settings -> Actions -> General`.

Enable:
1. Allow actions from selected sources only.
2. Require approval for first-time contributors.

Allowlist only used actions/workflows:
1. `actions/checkout@v4`
2. `actions/setup-node@v4`
3. `appleboy/ssh-action@v1.2.0`
4. `softprops/action-gh-release@v2`

Workflow permissions:
1. Default `GITHUB_TOKEN` permissions: `Read repository contents`.
2. Grant write permission only in workflows that actually need it (already done in `release.yml`).

## 5) Security Features

GitHub path:
`Settings -> Security` (or `Security` tab depending on org plan).

Enable:
1. Dependency graph.
2. Dependabot alerts.
3. Dependabot security updates.
4. Secret scanning.
5. Push protection for secrets.
6. Private vulnerability reporting (if available in your plan).

## 6) Environments and Deployment Controls

If using environments:
GitHub path:
`Settings -> Environments`.

Create environment: `production`.

Enable protections:
1. Required reviewers (1 or 2 maintainers).
2. Optional wait timer (5-10 min) for controlled deploys.

## 7) Repository Variables and Secrets (Exact)

GitHub path:
`Settings -> Secrets and variables -> Actions`.

### Variables
1. `DEPLOY_ENABLED=false` for demo stage.
2. `DEPLOY_PATH=<absolute path on server>`.
3. `HEALTH_BASE_URL=https://<public-domain>` (or put this in secret if preferred).

### Secrets
1. `DEPLOY_HOST`
2. `DEPLOY_USER`
3. `DEPLOY_SSH_KEY`
4. `HEALTH_BASE_URL` (optional if not stored as variable)

Policy:
- Keep `DEPLOY_ENABLED=false` until demo sign-off and production server validation.
- Set `DEPLOY_ENABLED=true` only at go-live.

## 8) Workflows Present in This Repo

1. `CI` (`.github/workflows/ci.yml`)
- Provides required checks: `Backend Checks`, `Frontend Checks`.

2. `Deploy Self-Hosted` (`.github/workflows/deploy-selfhosted.yml`)
- Runs only if deploy variables/secrets are present and `DEPLOY_ENABLED=true`.

3. `Security Audit` (`.github/workflows/security-audit.yml`)
- Scheduled and manual dependency audit.

4. `Health Smoke` (`.github/workflows/health-smoke.yml`)
- Scheduled/manual health check using `HEALTH_BASE_URL`.

5. `Release` (`.github/workflows/release.yml`)
- Tag/manual release validation and release archive publishing.

## 9) Recommended Demo -> Go-Live Toggle Plan

Demo stage:
1. `DEPLOY_ENABLED=false`.
2. Keep branch protection fully enabled.
3. Run CI + manual deployment by IT.
4. Use Health Smoke against demo URL if available.

Go-live stage:
1. Set `DEPLOY_ENABLED=true`.
2. Ensure deploy secrets/variables are populated and tested.
3. Keep all branch/security protections unchanged.
4. Enable production environment reviewers.

## 10) Optional Features to Disable if Unused

GitHub path:
`Settings -> General -> Features`.

Disable if unused by team policy:
1. Wikis
2. Discussions
3. Projects

## 11) Final Verification Checklist

1. PR to `main` is blocked without review.
2. PR to `main` is blocked when CI fails.
3. Force push to `main` is blocked.
4. Secret push protection blocks test secret.
5. Deploy workflow does not run when `DEPLOY_ENABLED=false`.
6. Deploy workflow runs when `DEPLOY_ENABLED=true` and CI on `main` succeeds.
