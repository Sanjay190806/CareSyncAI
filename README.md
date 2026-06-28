# CareSync AI

**From alarm noise to clinical clarity.**

Intelligent patient monitoring platform using personalized baseline intelligence instead of universal thresholds.

## Architecture (Phase 1)

```
┌─────────────┐     REST + WebSocket      ┌─────────────┐
│   frontend  │ ◄────────────────────────► │   backend   │
│  (React)    │                            │  (Node/TS)  │
└─────────────┘                            └──────┬──────┘
                                                  │
                    ┌─────────────────────────────┼─────────────────────────────┐
                    │                             │                             │
                    ▼                             ▼                             ▼
            ┌─────────────┐              ┌─────────────┐              ┌─────────────┐
            │  ai-engine  │              │  simulator  │              │  database   │
            │  (Python)   │              │  (Python)   │              │ (PostgreSQL)│
            └─────────────┘              └─────────────┘              └─────────────┘
```

| Module | Role | Tech |
|--------|------|------|
| `frontend/` | Clinical Command Center UI | React 18, TypeScript, Vite, Tailwind |
| `backend/` | API gateway, WebSocket hub, alert orchestration | Node.js, Express, TypeScript, Socket.io |
| `ai-engine/` | Baseline scoring, risk engine, clinical narratives | Python, FastAPI |
| `simulator/` | IoMT device ecosystem, physiological correlation | Python, asyncio |
| `database/` | Persistent storage, migrations, seeds | PostgreSQL 16 |

## Quick Start (Phase 1)

```bash
# Start database only
docker compose up postgres -d

# Individual modules — see each module's README
cd frontend && npm install && npm run dev
cd backend && npm install && npm run dev
cd ai-engine && pip install -r requirements.txt && uvicorn cares_ai.main:app --reload
cd simulator && pip install -r requirements.txt && python -m cares_sync_sim
```

## Documentation

- [Master Specification](docs/master-spec.md)
- [Frontend Architecture](frontend/README.md)
- [Backend Architecture](backend/README.md)
- [AI Engine Architecture](ai-engine/README.md)
- [Simulator Architecture](simulator/README.md)
- [Database Architecture](database/README.md)

## Phase 1 Scope

Phase 1 establishes folder structure, shared types, configuration, and service boundaries. **No clinical features are implemented yet.**
