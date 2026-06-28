# Database — PostgreSQL Persistence Layer

PostgreSQL 16 schema for patients, vitals, risk assessments, and alerts.

## Architectural Decisions

### PostgreSQL

- **Why PostgreSQL**: ACID compliance for clinical audit trails; native array types for diagnoses/medications; `uuid-ossp` for distributed-safe IDs; excellent time-series query performance with proper indexing.
- **Why not a time-series DB in Phase 1**: Vitals volume is simulated and manageable; PostgreSQL with `(patient_id, timestamp DESC)` indexes handles hackathon scale. Architecture allows TimescaleDB extension later.

### Schema Design (Current — `schema.sql`)

| Table | Purpose | Write Pattern |
|-------|---------|---------------|
| `patients` | Demographics, conditions, risk category | Low write |
| `vitals` | Time-series vital readings | High write |
| `risk_assessments` | Crisis probability scores | Medium write |
| `alerts` | Alert events with severity and actions | Medium write |

Indexes optimized for:

- Latest vitals per patient: `idx_vitals_patient_time`
- Unacknowledged alerts by severity: `idx_alerts_severity_time` (partial index)

### Migration Strategy

Numbered SQL files in `migrations/` — commented placeholders for Phase 2:

| Migration | Adds |
|-----------|------|
| `002_baseline_profiles` | Per-patient rolling mean/std per vital |
| `003_alert_tiers` | Five-tier system, narratives, suppression fields |
| `004_shift_reports` | Shift event timeline for handoff dashboard |
| `005_extended_vitals` | EtCO₂, glucose for high-acuity devices |

Migrations are commented until features are implemented — prevents schema drift during Phase 1.

### Alignment with Master Spec

Phase 1 retains the existing `schema.sql`. Phase 2 migrations will extend it to support:

- `baseline_mean` / `baseline_std_dev` per vital (not universal thresholds)
- Tier 1–5 alert model (not just Info/Warning/Critical)
- `suppressed` flag for smart suppression audit trail
- `clinical_narratives` for AI briefing storage
- `shift_events` for shift report dashboard

### Docker Integration

`docker-compose.yml` mounts `schema.sql` as init script — fresh PostgreSQL instances auto-apply base schema.

## Phase 1 Status

Base schema exists. Migration and seed files are documented placeholders. No runtime migrations applied.

## Usage

```bash
# Start PostgreSQL with auto-init
docker compose up postgres -d

# Manual apply (if needed)
psql postgresql://caresync:caresync_dev@localhost:5432/caresync -f database/schema.sql
```
