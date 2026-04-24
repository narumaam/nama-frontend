# NAMA OS

AI-first travel operating system for agencies, DMCs, and tour operators.

Production stack:

- frontend: `https://www.getnama.app`
- demo: `https://demo.getnama.app`
- backend: `https://intuitive-blessing-production-30de.up.railway.app`

## What this repo owns

- public marketing site
- registration and login flows
- dashboard experience
- Next.js API routes and edge middleware
- FastAPI backend under `backend/`
- deployment wiring for Vercel frontend + Railway backend

## Repo shape

```text
nama-frontend/
├── src/                  Next.js app and UI
├── backend/              FastAPI backend
├── docs/                 handover, deployment, product docs
├── public/               static assets
├── e2e/                  Playwright tests
├── vercel.json           frontend -> backend proxy rules
└── next.config.mjs       security headers and runtime config
```

## Local development

### Frontend

```bash
npm install
npm run dev
```

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Local env

Create `.env.local` in the repo root:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NAMA_API_KEY=your-api-key
NAMA_JWT_SECRET=your-jwt-secret
```

Create `.env` in `backend/`:

```env
DATABASE_URL=postgresql+asyncpg://user:pass@host/dbname
NAMA_API_KEY=your-api-key
NAMA_JWT_SECRET=your-jwt-secret
```

## Commands

```bash
npm run dev
npm run build
npm run lint
npm run test:e2e
```

## Deployment

### Vercel

- production project: `nama-frontend`
- demo project: `nama-web`
- production domain: `https://www.getnama.app`

### Railway

- backend service origin: `https://intuitive-blessing-production-30de.up.railway.app`
- health check: `https://intuitive-blessing-production-30de.up.railway.app/api/v1/health`

## Important notes

- `demo.getnama.app` is currently a separate Vercel project from production.
- `vercel.json` is critical because it proxies `/api/v1/*` traffic to Railway.
- token rotation and provider env verification are operational tasks and are not completed just by changing code in this repo.

## Docs

Start here:

- `docs/README.md`
- `docs/DEVELOPER_HANDOVER.md`
- `CLAUDE.md`
