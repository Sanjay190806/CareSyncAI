# Simulator — IoMT Device Ecosystem

Python service simulating 12 medical device types with physiologically correlated vital streams.

## Architectural Decisions

### Separate Simulator Service

- **Why not embed in backend**: Real IoMT architectures have edge devices publishing independently. A dedicated simulator mirrors production topology and lets the demo run without hardware.
- **Why Python**: Same stack as ai-engine; NumPy for correlated time-series generation.

### 12 Device Types (Registry Pattern)

`devices/registry.py` enumerates all devices per spec:

| Category | Devices |
|----------|---------|
| Bedside | Pulse Oximeter, ECG Monitor, NIBP Cuff, Temperature Probe |
| Wearables | Biosensor Patch, Smart Wristband, Fall Detection Belt, Smart IV Patch |
| High Acuity | Ventilator, Capnograph, Glucometer, Infusion Pump |

Each device has its own module implementing a common `base.py` interface. Devices emit only their primary signals; the correlation engine merges them into unified patient vital readings.

### Physiological Correlation Engine

`correlation/engine.py` enforces medical realism:

- SpO₂ ↓ → HR ↑
- BP ↓ + HR ↑ → Shock Pattern
- EtCO₂ ↑ + RR ↓ → Respiratory Depression
- Glucose > 200 + HR ↑ → Sepsis Risk

**Never generate random independent values.**

### Operation Modes

`modes/config.py` defines ICU, General Ward, RPM, and Ambulance:

- Different device subsets per mode
- Different refresh intervals (ICU: 500ms, Ward: 2s, RPM: 5s)

### Demo Scenario Isolation

`scenarios/patient_7_crisis.py` will implement the signature 15-second escalation:

Risk 32 → 58 → 79 → 91, Tier 2 → 3 → 4 → 5

Kept separate from normal simulation so judges can trigger the wow moment on demand.

### Publisher Pattern

`publishers/vitals_publisher.py` streams correlated vitals to backend via WebSocket — matching real IoMT ingestion patterns.

## Phase 1 Status

Health endpoint only. Device modules and correlation engine are stubs. No vital generation yet.

## Scripts

```bash
pip install -r requirements.txt
PYTHONPATH=src python -m cares_sync_sim
```
