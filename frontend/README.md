# Frontend — Clinical Command Center

React 18 single-page application for the CareSync AI monitoring dashboard.

## Architectural Decisions

### React + TypeScript + Vite

- **Why React**: Spec mandates clean React architecture; largest ecosystem for rapid hackathon UI.
- **Why TypeScript**: Shared domain types (`AlertTier`, `BaselineProfile`, `VitalReading`) must align with backend and AI engine contracts.
- **Why Vite**: Fast HMR for demo iteration; minimal config overhead.

### Feature-Based Folder Structure

```
src/
├── features/     # Domain slices (dashboard, alerts, patients, shift-report, demo)
├── components/ # Shared layout and UI primitives
├── services/   # API + WebSocket clients (interface-first)
├── types/      # Domain types mirroring master spec
├── theme/      # Design tokens (#0A0F1E, tier colors)
├── hooks/      # Data subscription hooks
└── stores/     # Cross-feature state
```

Each feature is self-contained. The **demo** feature isolates the Patient 7 respiratory crisis sequence without polluting production dashboard code.

### Tailwind + Design Tokens

Colors and typography are codified in `tailwind.config.js` and `theme/tokens.ts` per spec:

- Background `#0A0F1E`, Surface `#1E3A5F`
- Tier colors: Green → Teal → Amber → Orange → Red
- Inter for UI, JetBrains Mono for vitals

### Service Contracts (Interface-First)

`services/contracts.ts` defines `ApiClient` and `WebSocketClient` before implementation. This decouples UI from transport and enables mock-driven development during hackathon demos.

### Proxy Configuration

Vite dev server proxies `/api` and `/ws` to backend (`localhost:3001`) to avoid CORS issues during development.

## Phase 6 Status

Full ICU Command Center dashboard with mock real-time layer, patient grid, AI intelligence panel, detail drawer, demo crisis mode, and analytics pages.

Run `npm run dev` and open **Demo Mode** → **Patient 7 Crisis** for the main demo sequence.

## Scripts

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```
