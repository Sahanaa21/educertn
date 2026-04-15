# Frontend

Next.js frontend for the self-hosted Educert system.

## Environment

Create `frontend/.env.local` (or copy from `frontend/.env.example`):

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
```

## Development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Production

```bash
npm install
npm run build
npm start
```

The frontend expects the backend API at `NEXT_PUBLIC_API_BASE_URL`.
