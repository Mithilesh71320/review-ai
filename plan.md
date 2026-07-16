# ReviewAI Project Plan

## 1) Project Snapshot

### Product Goal
Build a review monitoring and response platform for salon/spa and local businesses that:
- connects business locations,
- fetches reviews,
- analyzes feedback with AI,
- prioritizes actions,
- supports operational improvements,
- and enables owner-side response workflows.

### Current Stack
- Frontend: Next.js App Router + Tailwind + TanStack Query
- Auth/Billing: Clerk
- Database: Neon Postgres
- ORM: Prisma
- AI: Gemini/OpenAI fallback orchestration in `src/lib/ai.ts`
- APIs: Route Handlers under `src/app/api/*`

## 2) Current Functional Coverage

### Auth + Route Protection
- Clerk authentication is integrated.
- Protected dashboard routes are enforced through `src/proxy.ts`.

### Multi-business Monitoring
- Users can manage multiple businesses (place IDs).
- Reviews/alerts/dashboard are business-scoped via `managedBusinessId`.

### Review Sync + Storage
- Google Places + Google Business Profile review ingestion path exists.
- Dedupe and idempotent upsert strategy is in place for reviews.

### AI Insights + Reply Flow
- AI Improvement Brief is generated server-side.
- AI reply draft generation and posting flow exists.
- UI supports draft, regenerate, and post actions.

### Billing + Entitlements
- Plan config is centralized.
- Plan-based feature limits/gates exist in backend and UI.
- Dev behavior for quicker plan-switch testing has been added.

## 3) Strategic Plan (Phased)

## Phase A — Stability + Correctness (Immediate)

### A1. Sentiment correctness hardening
- Keep text-first sentiment classification as source of truth.
- Add optional sentiment confidence score storage.
- Add review classification audit trail for reproducibility.

### A2. AI output contract hardening
- Enforce strict schema validation before returning insights.
- Reject malformed/empty sections and auto-fallback with deterministic template.
- Add server logs for prompt/result debugging with PII-safe redaction.

### A3. Business list persistence robustness
- Keep local-first UX.
- Add explicit autosave result indicator (“Saved”, “Saving”, “Retry”).
- Add retry queue for failed `keepalive` writes.

## Phase B — Product Quality (Short-term)

### B1. Prescriptive analysis maturity
- Convert insights from summary style to decision style:
  - Improve/Change
  - Remain Same
  - Recommended Actions
- Add “Evidence” line per recommendation for trust.
- Add “Impact Level” and “Effort Level” tags.

### B2. Operations workflow
- Add taskization from recommended actions.
- Assign owner + due date + completion state.
- Track “action implemented” vs sentiment trend over time.

### B3. Reply governance
- Add mandatory “owner/manager eligible” check UX before post action.
- Add approval mode:
  - Draft-only,
  - Draft+review,
  - Auto-post (future enterprise).

## Phase C — Scale + Reliability (Mid-term)

### C1. Background jobs
- Move review sync to queue/cron workers instead of request-bound long calls.
- Add incremental sync checkpoints per location.

### C2. Observability
- Add API latency, failure-rate, token refresh failures, and sync success dashboards.
- Add AI cost/usage observability by tenant and feature.

### C3. Data model evolution
- Add review tag entities and optional per-review AI metadata table:
  - tags,
  - urgency class,
  - sentiment confidence,
  - model version used.

## Phase D — Business Readiness (Long-term)

### D1. Admin panel
- Dynamic plan control (pricing/features/limits).
- Customer support tools.
- AI prompt versioning and rollout controls.

### D2. Enterprise controls
- Role-based team access (owner/manager/analyst).
- Change history and audit logs.
- Data export and compliance tooling.

## 4) Technical Workstreams

### Backend
- Normalize all business-critical checks to server-side services.
- Ensure all write APIs are idempotent where possible.
- Add stronger validation at route boundaries.

### Frontend
- Consolidate loading/skeleton/error patterns.
- Improve information architecture on settings/reviews.
- Add “last sync status” and “next sync” indicators.

### AI
- Prompt registry with version IDs.
- Golden test set for deterministic quality checks.
- Bias and hallucination checks around operations recommendations.

### Security
- Verify all protected APIs use user-scoped access.
- Rotate and protect API keys.
- Ensure logs do not contain secrets or sensitive PII.

### Testing
- Unit tests for:
  - sentiment classification,
  - fallback insight generation,
  - plan gating logic.
- Integration tests for:
  - review sync,
  - business management autosave behavior,
  - AI reply post permission handling.

## 5) Delivery Milestones

### Milestone 1 (1–2 weeks)
- Sentiment+insights quality hardening.
- Autosave reliability + status UI.
- Schema validation for AI outputs.

### Milestone 2 (2–4 weeks)
- Action taskization model + basic task board.
- Background review sync worker.
- Operational observability baseline.

### Milestone 3 (4–8 weeks)
- Admin controls for plans/prompts.
- Team role management + audit trail.
- Enterprise readiness checklist.

## 6) Definition of Done (Project Quality Bar)

- AI output is actionable, non-generic, and evidence-linked.
- Review sentiment is text-first and consistent across sync runs.
- Billing gates are enforced server-side and reflected correctly in UI.
- No silent data loss in settings/business updates.
- Key workflows pass automated tests and manual smoke checks.

## 7) Top Risks + Mitigations

### Risk: AI inconsistency
- Mitigation: schema enforcement + fallback templates + prompt versioning.

### Risk: Slow/fragile live sync
- Mitigation: queue-based background sync + retry strategy.

### Risk: Billing edge-case mismatch
- Mitigation: single entitlement resolver and environment-specific behavior tests.

### Risk: Permission confusion for posting replies
- Mitigation: explicit eligibility checks + clearer UI state and messages.

## 8) Recommended Next Build Order

1. Stabilize AI output contract and fallback determinism.
2. Add autosave reliability and visible save states.
3. Add review sync background processing.
4. Add action tracking from AI recommendations.
5. Add admin control layer (plans/prompts/roles).

