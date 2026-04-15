# Maintenance Guide

GitHub is the source of truth for this project.

## Repository Structure

```text
educert/
frontend/
backend/
docs/
README.md
```

## Update Flow

1. Pull the latest `main` branch.
2. Make changes locally.
3. Run the backend build and frontend build.
4. Commit the change.
5. Push to GitHub.
6. Update the server from GitHub if it is a live deployment.

## What To Keep Out Of Git

- `.env` files
- Build output
- Runtime uploads
- Test/demo artifacts
