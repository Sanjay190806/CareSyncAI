# CareSync AI — Production Deployment Guide

## Architecture

| Component | Target | Port |
|-----------|--------|------|
| Frontend (Vite/React) | Vercel or static CDN | 5173 dev |
| Backend (Node/Express + Socket.io) | Render / AWS / VPS | 3001 |
| PostgreSQL | Managed (Supabase/RDS) | 5432 |
| AI Engine (Python) | Optional sidecar | 8000 |

## Quick Start (Local)

```bash
./scripts/setup.sh
```

Or manually:

```bash
docker compose up postgres -d
cd backend && npm install && npm run dev
cd frontend && npm install && npm run dev
```

Frontend: http://localhost:5173  
Backend API: http://localhost:3001/api/health  
WebSocket: socket.io on port 3001

## Environment Variables

### Frontend (`frontend/.env`)

```
VITE_API_BASE_URL=http://localhost:3001/api
VITE_WS_URL=
VITE_POLL_INTERVAL_MS=15000
VITE_MOCK_FALLBACK=true
```

Production (Vercel):

```
VITE_API_BASE_URL=https://your-backend.onrender.com/api
VITE_MOCK_FALLBACK=true
```

### Backend (`backend/.env`)

```
PORT=3001
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/caresync
CORS_ORIGIN=https://your-frontend.vercel.app
AI_ENGINE_URL=http://ai-engine:8000
```

## Docker Production

```bash
docker compose --profile full up -d
```

## Phase 8 Runtime Features

- **WebSocket sync** — primary real-time mode via Socket.io
- **Polling fallback** — every 15s if WebSocket disconnects
- **Mock fallback** — demo-stable when backend offline
- **CODE RED alarm** — escalating audio until acknowledged
- **Patient Checker** — `/patient-checker` hybrid diagnostic assistant
- **Alert acknowledge** — `POST /api/alerts/:id/acknowledge`

## Vercel Deploy

```bash
cd frontend
vercel --prod
```

Update `vercel.json` rewrite target to your backend URL.

## Demo Checklist

1. Start frontend — mock data loads immediately
2. Run **Patient 7 Crisis** demo — CODE RED alarm + overlay
3. Click **ACKNOWLEDGE ALERT** — alarm stops
4. Open **Patient Checker** — complete interview → structured report
5. Connect backend — WebSocket status shows LIVE
