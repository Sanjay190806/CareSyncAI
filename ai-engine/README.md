# AI Engine — Baseline Intelligence & Clinical Narratives

Python FastAPI microservice housing all clinical scoring and AI narrative logic.

## Architectural Decisions

### Python + FastAPI

- **Why Python**: NumPy for rolling statistics; natural fit for baseline mean/std calculations and future ML extensions.
- **Why FastAPI**: Async HTTP, automatic OpenAPI docs, Pydantic validation — backend can introspect contracts during integration.

### Intelligence Isolation

The backend must **never** apply universal thresholds. All scoring lives here:

| Engine | Responsibility |
|--------|----------------|
| `engines/baseline/` | 30-minute rolling mean/std per vital; continuous baseline learning |
| `engines/risk/` | Deviation-based crisis probability (0–100); five-tier mapping |
| `engines/narrative/` | Clinical briefings with demographics, diagnoses, deviation context |

### Deviation-Based Scoring (Core Algorithm)

```
deviation_score = (current_value - patient_baseline_mean) / patient_baseline_std
```

Example from spec: COPD patient with SpO₂ baseline 89% (σ=1.2):

- Current 88% → 0.8σ → no alert
- Current 83% → 5σ → immediate escalation

### Pydantic Domain Models

`models/domain.py` mirrors frontend/backend TypeScript types with camelCase aliases for JSON interoperability.

### API Surface (Planned)

| Endpoint | Purpose |
|----------|---------|
| `POST /api/baseline/update` | Ingest vitals, update rolling statistics |
| `GET /api/baseline/{patientId}` | Retrieve current baseline profile |
| `POST /api/risk/score` | Compute crisis probability and tier |
| `POST /api/narrative/generate` | Generate clinical briefing |

## Phase 1 Status

Health endpoint only. Engine modules are documented stubs. No baseline or risk logic yet.

## Scripts

```bash
pip install -r requirements.txt
PYTHONPATH=src uvicorn cares_ai.main:app --reload --port 8000
```
