# GitHub Hardening Checklist

## Branch Protection (`main`)
- [x] CODEOWNERS file added in repo (`.github/CODEOWNERS`)
- [ ] Require pull request before merging (set in GitHub settings)
- [ ] Require approvals (minimum 1) (set in GitHub settings)
- [ ] Dismiss stale approvals on new commits (set in GitHub settings)
- [ ] Require status checks to pass (set in GitHub settings)
- [ ] Required checks:
  - `Backend Checks`
  - `Frontend Checks`
  - `Release / Validate Before Release` (for tag releases)
- [ ] Require linear history (set in GitHub settings)
- [ ] Restrict force pushes and deletions (set in GitHub settings)

## Repository Security
- [ ] Enable Dependabot alerts
- [ ] Enable Dependabot security updates
- [ ] Enable secret scanning (if available)
- [ ] Enable push protection for secrets

## Actions Hardening
- [ ] Restrict Actions to verified creators or selected actions
- [ ] Require approval for first-time external contributors
- [x] Review workflow permissions (least privilege baseline applied)
- [x] Auto-deploy is CI-gated and opt-in via `DEPLOY_ENABLED`

## Team Access Model
- [ ] Owner: full admin (you)
- [ ] Maintainers: write + PR approval
- [ ] Viewers: read-only
- [ ] No shared credentials

## Required Secrets
- [ ] `HEALTH_BASE_URL`
- [ ] `DEPLOY_HOST`
- [ ] `DEPLOY_USER`
- [ ] `DEPLOY_SSH_KEY`
- [ ] Any monitoring/webhook keys when introduced

## Required Variables
- [ ] `DEPLOY_ENABLED=true` (to enable deployment)
- [ ] `DEPLOY_PATH=/absolute/path/to/repo`

## Review Routine
- [ ] Weekly: check failed workflows and security alerts
- [ ] Monthly: review stale branches/PRs and access list