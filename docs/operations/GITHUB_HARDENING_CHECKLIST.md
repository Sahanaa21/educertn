# GitHub Hardening Checklist

## Branch Protection (`main`)
- [ ] Require pull request before merging
- [ ] Require approvals (minimum 1)
- [ ] Dismiss stale approvals on new commits
- [ ] Require status checks to pass
- [ ] Required checks:
  - `Backend Checks`
  - `Frontend Checks`
  - `Frontend E2E Smoke`
- [ ] Require linear history
- [ ] Restrict force pushes and deletions

## Repository Security
- [ ] Enable Dependabot alerts
- [ ] Enable Dependabot security updates
- [ ] Enable secret scanning (if available)
- [ ] Enable push protection for secrets

## Actions Hardening
- [ ] Restrict Actions to verified creators or selected actions
- [ ] Require approval for first-time external contributors
- [ ] Review workflow permissions (least privilege)

## Team Access Model
- [ ] Owner: full admin (you)
- [ ] Maintainers: write + PR approval
- [ ] Viewers: read-only
- [ ] No shared credentials

## Required Secrets
- [ ] `HEALTH_BASE_URL`
- [ ] Any monitoring/webhook keys when introduced

## Review Routine
- [ ] Weekly: check failed workflows and security alerts
- [ ] Monthly: review stale branches/PRs and access list