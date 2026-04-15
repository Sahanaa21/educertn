# Self-Hosted Auto-Deploy

This project includes an optional GitHub Actions workflow for automatic deployment to a college-managed server.

Workflow file:

- `.github/workflows/deploy-selfhosted.yml`

The workflow deploys only when deployment is explicitly enabled.

## Required GitHub Configuration

Set these repository values before enabling deployment.

### Repository Variables

1. `DEPLOY_ENABLED=true`
2. `DEPLOY_PATH=/absolute/path/to/educert` (path to checked-out repo on server)

### Repository Secrets

1. `DEPLOY_HOST` (server IP or hostname)
2. `DEPLOY_USER` (SSH user)
3. `DEPLOY_SSH_KEY` (private key in PEM/OpenSSH format)

## What the Workflow Does

1. Connects to the server over SSH.
2. Fast-forwards `main` in the server repo.
3. Builds backend and frontend.
4. Restarts PM2 processes (`backend`, `frontend`).

If `DEPLOY_ENABLED` is not `true`, the workflow remains inactive and does not deploy.

## Server Prerequisites

1. Node.js 20+ and npm installed.
2. PM2 installed globally.
3. Repository already cloned on server at `DEPLOY_PATH`.
4. Backend and frontend environment files present on server:
   - `backend/.env`
   - `frontend/.env.local`

## Manual Deployment Fallback (ZIP-Based)

Use this when GitHub-based SSH deploy is not available.

1. On local machine:
   - Build and test changes.
   - Create an archive of the repository contents.
2. Transfer archive to server using SCP/WinSCP.
3. On server:
   - Extract archive to a versioned release folder.
   - Copy persistent files (`backend/.env`, `frontend/.env.local`, `uploads/`).
   - Run `npm ci` + `npm run build` for backend and frontend.
   - Restart PM2 processes.
4. Keep previous release folder until smoke checks pass.

## Recommended Safety Controls

1. Protect `main` branch and require PR reviews.
2. Keep deployment permissions limited to maintainers.
3. Keep an immediate rollback path using previous release folder or git tag.
