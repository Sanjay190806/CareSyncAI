# CareSync AI

> **From alarm noise to clinical clarity.**  
> A modular AI-powered patient monitoring platform designed to convert continuous vital-sign streams into personalized risk intelligence, prioritized alerts, and clinician-friendly decision support.

![Project Status](https://img.shields.io/badge/status-Phase%201%20Architecture-blue)
![Frontend](https://img.shields.io/badge/frontend-React%2018%20%2B%20TypeScript-61DAFB)
![Backend](https://img.shields.io/badge/backend-Node.js%20%2B%20Express-339933)
![AI Engine](https://img.shields.io/badge/AI%20Engine-Python%20%2B%20FastAPI-009688)
![Database](https://img.shields.io/badge/database-PostgreSQL%2016-4169E1)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

---

## Table of Contents

- [Overview](#overview)
- [Problem Statement](#problem-statement)
- [Solution](#solution)
- [Core Idea](#core-idea)
- [System Architecture](#system-architecture)
- [High-Level Data Flow](#high-level-data-flow)
- [Module Responsibilities](#module-responsibilities)
- [Repository Structure](#repository-structure)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [API Design](#api-design)
- [AI Risk Engine Design](#ai-risk-engine-design)
- [Alert Prioritization Strategy](#alert-prioritization-strategy)
- [Engineering Principles](#engineering-principles)
- [Current Phase Scope](#current-phase-scope)
- [Roadmap](#roadmap)
- [Future Improvements](#future-improvements)
- [Important Disclaimer](#important-disclaimer)
- [Author](#author)

---

## Overview

**CareSync AI** is an intelligent patient monitoring system built around a simple but important idea:

> Clinical monitoring should not depend only on universal thresholds.  
> It should understand each patient’s baseline and detect meaningful deviation from that baseline.

Traditional monitoring systems can generate noisy alerts because they often treat all patients the same. CareSync AI is designed to reduce that noise by combining:

- Personalized patient baseline intelligence
- Real-time vital-sign streaming
- AI-assisted risk scoring
- Alert prioritization
- Clinician-focused dashboarding
- Modular service-based architecture

The project is currently in **Phase 1**, focused on architecture, folder structure, service boundaries, and project foundation.

---

## Problem Statement

Hospitals and care teams receive continuous streams of patient vitals such as:

- Heart rate
- Oxygen saturation
- Blood pressure
- Temperature
- Respiratory indicators

However, raw vitals alone are not enough. A reading that is dangerous for one patient may be normal for another, depending on age, condition, history, medication, and baseline physiology.

Common issues in patient monitoring systems:

1. **Alarm fatigue**  
   Too many alerts reduce clinician attention and increase the chance of missing critical events.

2. **Universal threshold limitations**  
   Fixed thresholds do not adapt well to patient-specific baselines.

3. **Poor prioritization**  
   Clinicians need to know not only who is abnormal, but who needs attention first.

4. **Disconnected systems**  
   Data ingestion, alerting, AI inference, and dashboarding are often handled separately.

5. **Limited explainability**  
   A useful clinical AI system should explain why a patient was marked as risky.

---

## Solution

CareSync AI proposes a modular healthcare intelligence platform where patient vitals are continuously processed through a real-time pipeline.

The system is designed to:

- Simulate IoMT-style patient vital streams
- Ingest real-time patient data through backend services
- Analyze vitals using a Python AI engine
- Compare live vitals against personalized baselines
- Generate patient risk scores
- Prioritize alerts based on severity and trend
- Display insights through a clinical command center UI
- Persist structured data in PostgreSQL

---

## Core Idea

CareSync AI moves from:

```text
Static threshold alerting
```

to:

```text
Personalized baseline-aware risk intelligence
```

Instead of asking:

```text
"Is this heart rate above a universal limit?"
```

the system asks:

```text
"Is this patient's current condition meaningfully different from their normal pattern?"
```

That shift makes the project more realistic, more intelligent, and more portfolio-worthy.

---

## System Architecture

### Phase 1 Architecture

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                              CareSync AI Platform                            │
└──────────────────────────────────────────────────────────────────────────────┘

        ┌──────────────────────┐
        │      Frontend        │
        │ React + TypeScript   │
        │ Clinical Dashboard   │
        └──────────┬───────────┘
                   │
                   │ REST + WebSocket
                   ▼
        ┌──────────────────────┐
        │       Backend        │
        │ Node.js + Express    │
        │ API Gateway          │
        │ WebSocket Hub        │
        └──────────┬───────────┘
                   │
     ┌─────────────┼──────────────────────────────┐
     │             │                              │
     ▼             ▼                              ▼
┌──────────┐  ┌──────────────┐              ┌──────────────┐
│ AI Engine│  │  Simulator   │              │  Database    │
│ FastAPI  │  │ Python Async │              │ PostgreSQL   │
│ Risk AI  │  │ Vital Stream │              │ Persistence  │
└──────────┘  └──────────────┘              └──────────────┘
```

---

## High-Level Data Flow

```mermaid
flowchart LR
    A[Patient Simulator] --> B[Backend API Gateway]
    B --> C[AI Engine]
    C --> D[Risk Score + Explanation]
    D --> B
    B --> E[PostgreSQL Database]
    B --> F[WebSocket Event Stream]
    F --> G[Clinical Dashboard]
```

### Step-by-step flow

1. **Simulator generates vitals**  
   The simulator produces patient vital streams similar to IoMT device data.

2. **Backend receives the data**  
   The backend acts as the API gateway and real-time communication layer.

3. **AI engine analyzes risk**  
   The AI engine processes patient vitals and evaluates deviation from expected baseline behavior.

4. **Risk score is returned**  
   The AI engine returns score, severity, and narrative explanation.

5. **Data is persisted**  
   Patient readings, risk scores, and alerts are stored in PostgreSQL.

6. **Dashboard updates in real time**  
   The frontend receives updates using WebSocket events and displays patient state.

---

## Module Responsibilities

| Module | Responsibility | Technology |
|---|---|---|
| `frontend/` | Clinical command center UI, dashboard, patient cards, alert views | React 18, TypeScript, Vite, Tailwind |
| `backend/` | API gateway, WebSocket hub, alert orchestration, service coordination | Node.js, Express, TypeScript, Socket.io |
| `ai-engine/` | Baseline scoring, risk analysis, clinical explanation generation | Python, FastAPI |
| `simulator/` | Simulated IoMT patient vital streams and physiological patterns | Python, asyncio |
| `database/` | Data schema, migrations, seeds, persistent storage | PostgreSQL 16 |
| `docs/` | Architecture notes, design decisions, specifications | Markdown |

---

## Repository Structure

```text
CareSyncAI/
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── README.md
│
├── backend/
│   ├── src/
│   ├── package.json
│   └── README.md
│
├── ai-engine/
│   ├── cares_ai/
│   ├── requirements.txt
│   └── README.md
│
├── simulator/
│   ├── cares_sync_sim/
│   ├── requirements.txt
│   └── README.md
│
├── database/
│   ├── migrations/
│   ├── seeds/
│   └── README.md
│
├── docs/
│   ├── master-spec.md
│   └── architecture.md
│
├── docker-compose.yml
├── README.md
└── .gitignore
```

---

## Tech Stack

### Frontend

- React 18
- TypeScript
- Vite
- Tailwind CSS
- WebSocket client for real-time updates

### Backend

- Node.js
- Express.js
- TypeScript
- Socket.io
- REST API layer
- WebSocket event orchestration

### AI Engine

- Python
- FastAPI
- Baseline-aware scoring logic
- Risk classification
- Clinical narrative generation

### Simulator

- Python
- asyncio
- Synthetic patient streams
- Physiological correlation simulation

### Database

- PostgreSQL 16
- Relational schema design
- Migrations
- Seed data

### DevOps / Tooling

- Docker Compose
- Git
- Modular README documentation
- Environment-based configuration

---

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/Sanjay190806/CareSyncAI.git
cd CareSyncAI
```

### 2. Start PostgreSQL

```bash
docker compose up postgres -d
```

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

### 4. Start the backend

```bash
cd backend
npm install
npm run dev
```

### 5. Start the AI engine

```bash
cd ai-engine
pip install -r requirements.txt
uvicorn cares_ai.main:app --reload
```

### 6. Start the simulator

```bash
cd simulator
pip install -r requirements.txt
python -m cares_sync_sim
```

---

## Environment Variables

Create `.env` files inside the required services.

### Backend `.env`

```env
PORT=5000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/caresync
AI_ENGINE_URL=http://localhost:8000
CLIENT_URL=http://localhost:5173
```

### AI Engine `.env`

```env
AI_ENGINE_PORT=8000
RISK_MODEL_MODE=baseline
LOG_LEVEL=info
```

### Frontend `.env`

```env
VITE_API_BASE_URL=http://localhost:5000
VITE_WS_URL=ws://localhost:5000
```

> Never commit real secrets, production credentials, tokens, or private keys.

---

## API Design

### Core API Areas

| Area | Example Endpoint | Purpose |
|---|---|---|
| Health | `GET /health` | Service health check |
| Patients | `GET /patients` | List monitored patients |
| Vitals | `POST /vitals` | Ingest patient vitals |
| Risk | `POST /risk/analyze` | Request risk analysis |
| Alerts | `GET /alerts` | Fetch active alerts |
| Events | WebSocket | Stream live patient updates |

### Example Risk Payload

```json
{
  "patientId": "patient_007",
  "timestamp": "2026-06-28T10:30:00Z",
  "vitals": {
    "heartRate": 118,
    "spo2": 91,
    "systolicBp": 145,
    "diastolicBp": 95,
    "temperature": 38.4
  }
}
```

### Example Risk Response

```json
{
  "patientId": "patient_007",
  "riskScore": 82,
  "severity": "critical",
  "reason": "SpO2 dropped below patient baseline while heart rate and temperature increased together.",
  "recommendedAction": "Prioritize clinical review and continue close monitoring."
}
```

---

## AI Risk Engine Design

The AI engine is designed as a separate Python service so the healthcare intelligence layer can evolve independently from the frontend and backend.

### Risk Engine Goals

- Analyze patient vital trends
- Compare readings against baseline patterns
- Detect abnormal deviation
- Produce normalized risk score
- Generate human-readable explanation
- Return severity classification

### Risk Score Bands

| Risk Score | Severity | Meaning |
|---:|---|---|
| 0–30 | Stable | Patient appears within expected range |
| 31–70 | Warning | Patient shows meaningful deviation |
| 71–100 | Critical | Patient may require urgent attention |

### Baseline-Aware Scoring Concept

```text
Risk = f(current vitals, patient baseline, deviation magnitude, trend direction, correlation between vitals)
```

This allows the system to detect not just isolated abnormal readings, but patterns that may indicate deterioration.

---

## Alert Prioritization Strategy

CareSync AI is designed to prioritize patients using more than one signal.

Possible prioritization factors:

- Current risk score
- Rate of deterioration
- Number of abnormal vitals
- Duration of abnormal condition
- Baseline deviation
- Clinical severity category
- Recent escalation history

Example:

```text
Patient A: SpO2 = 91 but stable baseline and no trend change
Patient B: SpO2 = 94 but rapidly dropping with rising heart rate

CareSync AI should prioritize Patient B.
```

This is the core intelligence layer that makes the project stronger than a simple dashboard.

---

## Engineering Principles

This project follows engineering practices expected in production-grade systems:

### 1. Modular Service Boundaries

Each major responsibility has its own module:

- UI
- API gateway
- AI inference
- Simulation
- Database

This keeps the system easier to test, scale, and maintain.

### 2. Separation of Concerns

The frontend does not directly run AI logic.  
The backend does not directly own model intelligence.  
The simulator does not depend on UI behavior.

Each module has a clear role.

### 3. Real-Time First Design

Patient monitoring is time-sensitive. The architecture uses WebSocket-based updates so the dashboard can respond quickly to changing patient state.

### 4. Explainability

A risk score alone is not enough. The AI engine is designed to return explanations so clinicians can understand why an alert was generated.

### 5. Scalable Foundation

The architecture can later support:

- Real IoMT device ingestion
- Message queues
- Model versioning
- Authentication
- Audit logs
- Cloud deployment
- Multi-hospital tenancy

---

## Current Phase Scope

### Phase 1: Architecture Foundation

Current focus:

- Repository structure
- Module boundaries
- Shared documentation
- Initial service setup
- Development workflow
- Database foundation
- Docker Compose setup

### Not yet implemented in Phase 1

- Full clinical AI features
- Production model training
- Authentication
- Real hospital integration
- Real medical device integration
- Production deployment

---

## Roadmap

### Phase 1 — Foundation

- [x] Define architecture
- [x] Create modular folder structure
- [x] Establish service boundaries
- [x] Add project documentation
- [ ] Finalize Docker Compose setup
- [ ] Add base health checks for all services

### Phase 2 — Core Pipeline

- [ ] Implement simulator vital stream
- [ ] Build backend ingestion API
- [ ] Connect backend to AI engine
- [ ] Store readings in PostgreSQL
- [ ] Stream live events to frontend

### Phase 3 — AI Intelligence

- [ ] Implement baseline-aware risk engine
- [ ] Add risk score calculation
- [ ] Add severity classification
- [ ] Add clinical explanation output
- [ ] Add anomaly detection experiments

### Phase 4 — Dashboard Experience

- [ ] Build command center UI
- [ ] Add patient cards
- [ ] Add risk trend charts
- [ ] Add critical alert panel
- [ ] Add patient detail view

### Phase 5 — Production Readiness

- [ ] Add authentication
- [ ] Add API validation
- [ ] Add logging and monitoring
- [ ] Add unit and integration tests
- [ ] Add CI/CD pipeline
- [ ] Add deployment documentation

---

## Future Improvements

- Kafka or RabbitMQ for event-driven ingestion
- Redis for real-time caching
- MLflow for model tracking
- Dockerized multi-service deployment
- Role-based access control
- Audit logs for clinical actions
- Cloud deployment on AWS/GCP/Azure
- Synthetic dataset generation
- Model explainability dashboard
- FHIR-compatible healthcare data integration

---

## Documentation

- [Master Specification](docs/master-spec.md)
- [Frontend Architecture](frontend/README.md)
- [Backend Architecture](backend/README.md)
- [AI Engine Architecture](ai-engine/README.md)
- [Simulator Architecture](simulator/README.md)
- [Database Architecture](database/README.md)

---

## Important Disclaimer

CareSync AI is an educational and portfolio project.  
It is **not a certified medical device**, **not a clinical diagnostic system**, and must not be used for real patient care without proper validation, regulatory approval, clinical testing, and expert review.

---

## Author

**Sanjay K**  
B.E. Electronics and Communication Engineering  
Aspiring AI Product Builder / Software Engineer

GitHub: [Sanjay190806](https://github.com/Sanjay190806)

---

## Recruiter / Reviewer Note

This repository demonstrates:

- Full-stack architecture thinking
- AI system design
- Real-time data pipeline planning
- Healthcare problem understanding
- Modular backend and AI service separation
- Product-focused engineering mindset
- Clean documentation and roadmap planning
