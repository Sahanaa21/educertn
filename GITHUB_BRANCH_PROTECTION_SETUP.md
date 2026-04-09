# GitHub Branch Protection Configuration

This document outlines the recommended branch protection settings for production safety and code quality.

## Overview

Branch protection rules enforce code quality standards and prevent accidental deployments of untested or unreviewed code to production branches.

## Recommended Settings for `main` Branch

### 1. **Require Pull Request Reviews**
- ✅ **Enable**: Require pull request reviews before merging
  - **Dismissal restrictions**: Dismiss stale pull request approvals when new commits are pushed
  - **Require review from code owners**: Enable to require approval from CODEOWNERS file
  - **Minimum reviewers**: 1 (can increase to 2 for additional safety)

### 2. **Require Status Checks to Pass**
The following checks should pass before merge is allowed:
- ✅ `ci / backend` - TypeScript typecheck, build, and tests
- ✅ `ci / frontend` - Lint, build, and e2e smoke tests
- ✅ `security-audit / backend` - npm audit for critical vulnerabilities
- ✅ `security-audit / frontend` - npm audit for critical vulnerabilities

**Configuration:**
- ✅ **Require branches to be up to date before merging**: Ensures PR is tested against latest `main`
- ✅ **Require status checks to pass before merging**: Blocks merge if any check fails

### 3. **Require Signed Commits**
- ✅ **Enable**: Require all commits to be signed with GPG or S/MIME
  - Ensures commit authenticity and prevents unauthorized commits
  - All maintainers should set up commit signing: https://docs.github.com/en/authentication/managing-commit-signature-verification/signing-commits

### 4. **Require Up-to-Date Branches**
- ✅ **Enable**: Require branches to be up to date before merging
  - Prevents merging stale branches
  - Ensures all status checks are run against latest code

### 5. **Require Code Owner Review**
- ✅ **Enable**: If CODEOWNERS file is configured
  - Ensures relevant domain experts review changes
  - Sample CODEOWNERS file:
    ```
    # Backend changes require backend maintainer review
    /backend/ @backend-maintainer
    
    # Frontend changes require frontend maintainer review
    /frontend/ @frontend-maintainer
    
    # Infrastructure/deployment requires admin review
    /.github/ @admin-maintainer
    .env.* @admin-maintainer
    ```

### 6. **Require Conversation Resolution**
- ✅ **Enable**: Require all conversations on code to be resolved before merging
  - Ensures comments are addressed and not left unresolved
  - Prevents accidentally merging PRs with ongoing discussions

### 7. **Restrict Who Can Push**
- ✅ **Enable**: Restrict who can push to matching branches
  - **Allow specified actors to bypass**: Specify only CI/automation accounts if auto-merge is needed
  - Recommended: Only maintainers should bypass (if at all)

### 8. **Require Linear History**
- ✅ **Enable**: Require linear history
  - Prevents merge commits, keeps history clean
  - Enforces squash-and-merge for pull requests

### 9. **Automatic Deletion of Branches**
- ✅ **Enable**: Automatically delete head branches
  - Cleans up merged branches automatically
  - Reduces branch clutter

## Protection Rules for Other Branches

### Development/Staging Branches (`develop`, `staging`)

Slightly less restrictive than production:
- Require pull request reviews (minimum 1 reviewer)
- Require status checks to pass (CI only, no signing requirements)
- Automatic branch deletion on merge
- Optional: Require conversations to be resolved

### Feature Branches

No branch protection rules - developers have full control during development.

## Enforcement

### For Admin/Maintainer Approval

```yaml
# GitHub API call to enforce rules
PATCH /repos/{owner}/{repo}/branches/main/protection
{
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true,
    "required_approving_review_count": 1
  },
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "ci/backend",
      "ci/frontend",
      "security-audit/backend",
      "security-audit/frontend"
    ]
  },
  "enforce_admins": true,
  "require_linear_history": true,
  "require_conversation_resolution": true,
  "allow_force_pushes": false,
  "allow_deletions": false
}
```

## Handling Blocked PRs

If a PR is blocked due to branch protection:

1. **Failed Status Checks**: Run the failing CI job locally to debug, fix the issue, and push changes
2. **Pending Reviews**: Request review from appropriate team members using `@mentions`
3. **Stale PR**: Click "Update branch" to sync with latest `main`
4. **Unresolved Conversations**: Address comments and mark conversations as resolved
5. **Commit Signing**: Set up GPG/commit signing following GitHub docs

## Exceptions & Emergency Procedures

In case of critical production issues requiring immediate bypass:

1. **Critical Hotfix**: Use the `/hotfix` branch workflow (protected branch with minimal review requirements)
2. **Emergency Bypass**: Only administrators can bypass checks - requires explicit approval and post-incident review
3. **Post-Incident**: Review what went wrong to improve future prevention

## Implementation Checklist

- [ ] Enable require pull request reviews
- [ ] Enable require status checks (CI passes)
- [ ] Enable require signed commits (after team setup)
- [ ] Enable require up-to-date branches
- [ ] Enable require conversation resolution
- [ ] Enable linear history
- [ ] Configure auto-deletion of branches
- [ ] Add CODEOWNERS file with team assignments
- [ ] Document exception procedures
- [ ] Train team on protection rules

## References

- [GitHub Branch Protection Documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub CODEOWNERS](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
- [Commit Signature Verification](https://docs.github.com/en/authentication/managing-commit-signature-verification)
