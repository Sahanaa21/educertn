# Release Policy

This project uses semantic versioning tags and GitHub Releases.

## Versioning

1. Tag format: `vMAJOR.MINOR.PATCH`
2. Increment rules:
   - `PATCH`: bug fixes, non-breaking hardening
   - `MINOR`: backwards-compatible features
   - `MAJOR`: breaking changes

## Release Process

1. Merge approved PRs into `main`.
2. Ensure CI is green.
3. Create and push a tag:
   - `git tag vX.Y.Z`
   - `git push origin vX.Y.Z`
4. GitHub `Release` workflow validates backend/frontend and publishes release notes plus source ZIP.

## Required Release Notes Content

1. Summary of user-visible changes
2. Deployment notes (env or migration steps)
3. Rollback notes
4. Known limitations

## Rollback Rule

If production fails after deployment:

1. Roll back to previous known-good tag immediately.
2. Open incident note in operations docs.
3. Ship fix through normal PR + CI flow.
