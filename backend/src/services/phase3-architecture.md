# Phase 3 architecture

1. Simulator publishes vital readings to the backend REST endpoint.
2. The backend vitals controller delegates ingestion to the integration service.
3. The integration service persists vitals, calls the AI engine for baseline and risk evaluation, and emits WebSocket updates.
4. Alert suppression is handled centrally in the alert service with deduplication and recovery rules.
5. The WebSocket gateway broadcasts vitals:update, risk:update, alert:update, and patient:update events.
