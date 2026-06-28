# CareSync AI — System Architecture

## Design Principles

1. **Separation of concerns** — UI, orchestration, intelligence, and simulation are independent deployable units.
2. **Event-driven vitals pipeline** — Simulator → Backend → Frontend via WebSocket; Backend persists to PostgreSQL.
3. **Baseline-first alerting** — All scoring logic lives in `ai-engine`; backend never applies universal thresholds.
4. **Hackathon-ready, production-shaped** — Monorepo with clear module boundaries scalable to hospital deployment.

## Data Flow

```
Simulator (12 devices)
    │  correlated vital streams
    ▼
Backend (ingest + route)
    │  persist                    │  score request
    ▼                             ▼
PostgreSQL                   AI Engine
    │                             │
    │  REST queries               │  risk tier + narrative
    ▼                             ▼
Backend ◄─────────────────────────┘
    │  WebSocket push
    ▼
Frontend (Command Center)
```

## Alert Tier Model

| Tier | Score | Channel |
|------|-------|---------|
| 1 | 0–20 | Dashboard (silent) |
| 2 | 21–40 | Dashboard (advisory) |
| 3 | 41–65 | Dashboard + AI narrative + soft sound |
| 4 | 66–85 | Dashboard + pager sim + escalation timer |
| 5 | 86–100 | CODE RED mode + physician alert + incident log |

## Operation Modes

Configured in simulator; propagated through backend to frontend:

- ICU
- General Ward
- Remote Patient Monitoring
- Ambulance

Each mode affects device set, refresh frequency, and alert behaviour.

## Module Communication

| From | To | Protocol | Purpose |
|------|-----|----------|---------|
| Frontend | Backend | REST | Patients, alerts, shift reports |
| Frontend | Backend | WebSocket | Live vitals, tier changes |
| Backend | AI Engine | HTTP | Baseline update, risk score, narrative |
| Simulator | Backend | WebSocket/HTTP | Vital stream ingestion |
| Backend | PostgreSQL | SQL | Persistence |
