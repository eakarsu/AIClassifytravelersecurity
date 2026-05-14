# Audit Note — AIClassifytravelersecurity

Source: `_AUDIT/reports/batch_01.md` (Project 25)

## Maturity: PARTIAL-BUILD (18 routes; audit reports 0 AI endpoints, but ai.js + aiNew.js exist)

## Original audit recommendations

### Gaps & Opportunities
- Missing Notifications.
- Missing Integration API.

### Strategic Feature Suggestions
1. Agentic Workflow Orchestration
2. RAG over Domain Documents
3. Real-time Anomaly Detection
4. White-label/Reseller Platform

## Categorization
- **MECHANICAL:** notifications, webhooks (CRUD).
- **NEEDS-PRODUCT-DECISION:** agentic workflows, RAG, white-label.

## Implementations applied
1. **`backend/routes/notifications.js`** — full CRUD with DB-detect + memory fallback.
2. **`backend/routes/webhooks.js`** — webhook registry + manual test-delivery.
3. **`backend/server.js`** — mounted at `/api/notifications` and `/api/webhooks`.

Syntax-checked with `node --check`.

## Backlog (prioritized)

### High priority
- **SOS event → notification + webhook fan-out** (currently SOS endpoint exists but doesn't fan out).
- **Real-time geofence breach stream (SSE)** — wire the existing geofence module to SSE.

### Medium priority
- **RAG over country travel advisories** — vector DB of advisories.js content.
- **`POST /api/ai/itinerary-risk-score`** — synthesize trip + threats + advisories into risk score.

### Low priority
- White-label per-corp branding.
- Agentic incident-response workflow.

## Apply pass 3 (frontend)

- **Action:** LEFT-AS-IS
- **Stack:** Express + Vite/React, JWT Bearer auth via `frontend/src/api.js` (`localStorage.getItem('token')`).
- **Backend endpoints checked:** all 10 `/api/ai/*` endpoints from `routes/ai.js` (6) + `routes/aiNew.js` (4).
- **Frontend wiring:** Every endpoint already has a matching FE caller — `Alerts.jsx`, `Destinations.jsx`, `Assessments.jsx`, `Threats.jsx`, `Advisories.jsx`, `Incidents.jsx`, `RealTimeThreat.jsx`, `EvacuationPlanner.jsx`, `MedicalRisk.jsx`, `CyberSecurity.jsx`.
- **No FE files modified.** Idempotence rule applied.
- See `_AUDIT/apply3_logs/ab3_60.md` for batch detail.
