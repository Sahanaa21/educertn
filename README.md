# Educert

Production-ready, self-hosted college portal for certificate requests, company verification, academic services, and issue reporting.

This repository is designed to run fully on one server using Node.js, PostgreSQL, and local file storage. No external cloud storage or hosting platform is required.

## Project Structure

```text
educert/
docs/
docs/operations/
frontend/
backend/
README.md
```

## Requirements

1. Node.js 20+.
2. PostgreSQL 14+.
3. A Linux or Windows server.
4. Optional: NGINX and PM2 for production process management.

## Installation

1. Install Node.js.
2. Install PostgreSQL.
3. Create the database:

```bash
createdb educert
```

4. Configure the environment files:
   - Copy `backend/.env.example` to `backend/.env`.
   - Copy `frontend/.env.example` to `frontend/.env.local`.
5. Update the database credentials, JWT secret, SMTP settings, and payment provider credentials in `backend/.env`.
6. If you want the public file URLs to use a real server IP or domain, set `BASE_URL` to that value.

## Backend

```bash
cd backend
npm install
npm run build
npm start
```

For PM2:

```bash
cd backend
pm2 start ecosystem.config.js
pm2 save
```

Backend runs on port `5000` by default.

## Frontend

```bash
cd frontend
npm install
npm run build
npm start
```

Frontend runs on port `3000` by default.

## Access

- Frontend: `http://localhost`
- Backend API: `http://localhost:5000`
- Uploaded files: `http://localhost:5000/uploads/<filename>`

If you deploy behind NGINX, keep the frontend on port `3000` and proxy `/api` and `/uploads` to the backend.

## NGINX Sample

```nginx
server {
    listen 80;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads {
        proxy_pass http://localhost:5000/uploads;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Environment Files

Backend `backend/.env`:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=educert
JWT_SECRET=your_secret
BASE_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
```

Frontend `frontend/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
```

## Database Schema

Use `backend/prisma/local_schema.sql` if you want to create the schema manually in PostgreSQL.

## Maintenance Workflow

GitHub is the source of truth for this project. For any future change:

1. Pull the latest `main` branch.
2. Make the change locally.
3. Run the backend and frontend builds.
4. Commit and push to GitHub.
5. Deploy or restart the server from the updated repository state.

If the college IT team only has GitHub access, they can keep the server synchronized by pulling `main` and restarting the backend and frontend services after each approved update.
