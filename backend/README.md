# Backend — API Gateway & Orchestration

Node.js/Express service that coordinates vitals ingestion, persistence, AI scoring, and real-time delivery to the frontend.

## Architectural Decisions

### Node.js + Express + TypeScript

- **Why Node**: Native WebSocket support via Socket.io; single runtime for REST + real-time — critical for live vital streams and tier escalation during the 15-second demo sequence.
- **Why Express**: Minimal, well-understood; fast to wire routes during a hackathon without framework ceremony.
- **Why TypeScript**: Domain types are shared conceptually with frontend; compile-time safety on alert tiers and vital schemas.

### Layered Architecture

```
routes/       → HTTP entry points
controllers/  → Request/response mapping
services/     → Business logic (alerts, suppression, vitals)
websocket/    → Real-time fan-out to frontend
config/       → Environment-driven configuration
types/        → Domain contracts
```

Routes stay thin. All clinical intelligence is delegated to `ai-engine` — the backend orchestrates, it does not score.

### Smart Suppression Lives Here

Per spec, three suppression mechanisms are backend responsibilities:

1. **Deduplication** — 5-minute window unless score increases 10+
2. **Baseline personalisation** — enforced by calling ai-engine, not local thresholds
3. **Recovery suppression** — trend direction lowers priority

`suppression.service.ts` will implement these rules before emitting alerts.

### AI Engine as External Service

`ai-engine.client.ts` calls Python FastAPI for:

- Baseline rolling mean/std calculation
- Deviation-based crisis probability score
- Clinical narrative generation

This keeps ML/narrative logic out of the Node process and allows independent scaling.

### WebSocket Hub

`websocket/hub.ts` will broadcast:

- `vitals:update`
- `risk:update`
- `alert:triggered` / `alert:escalated`
- `tier:changed`

Simulator ingests vitals; backend persists and fans out.

### PostgreSQL via `pg`

Direct SQL with connection pooling — no ORM in Phase 1. Hospital deployments often need explicit query control for high-write vitals tables.

## Phase 1 Status

Health endpoint only (`GET /api/health`). Service stubs for all domains. No database connection, WebSocket, or alert logic yet.

## Scripts

```bash
npm install
npm run dev      # http://localhost:3001
npm run build && npm start
```
