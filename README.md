# SHWAI School Management Platform

React 19 + TypeScript + Vite application using TanStack Router/Start, Tailwind v4, shadcn/ui, Recharts, TanStack Table, Framer Motion, TanStack Start server functions, and PostgreSQL persistence where configured. The repository contains an authenticated V1 foundation, a V2 academic-core slice, a V3 AI Learning + AI Content + AI Teacher Assistance slice, a V4 Intelligence + Intervention slice, and a V5 Enterprise Operations + Decision Intelligence slice. V5 uses persisted operational records and transparent calculations; it does not implement V6 advanced predictive analytics, advanced AI governance, or career intelligence.

## Run

```bash
npm install
npm run dev      # http://localhost:8080
npm run check
npm test
npm run build
npm run db:migrate # requires DATABASE_URL or SUPABASE_DATABASE_URL
```

## Running SHWAI locally

### Prerequisites

Use Node.js 22 or newer and npm. PostgreSQL is optional for the public preview, but required for authentication, migrations, imports, attendance, homework, grades, notices, notifications, audit logs, V1–V6 persistence, and the fictional role accounts.

### Install and configure

```bash
npm install
cp .env.example .env
```

Keep `.env` local and never commit it. For a public-only preview, leave database/provider secrets empty. For a complete fictional school preview, set `NODE_ENV=development`, `PUBLIC_APP_URL=http://localhost:8080`, and either `DATABASE_URL` or `SUPABASE_DATABASE_URL` to a local PostgreSQL database.

### Migrate and seed fictional data

```bash
npm run db:migrate
npm run db:seed:dev
```

The seed command refuses to run outside `NODE_ENV=development`, contains no real student/teacher/parent data, and uses the real PBKDF2/session/membership authentication architecture. Local demo accounts use the documented fictional password `DemoOnly!2026`:

| Role | Email |
| --- | --- |
| Owner | `owner@demo.local` |
| Principal | `principal@demo.local` |
| Administrator | `admin@demo.local` |
| Teacher | `teacher@demo.local` |
| Student | `student@demo.local` |
| Parent | `parent@demo.local` |
| Staff | `staff@demo.local` |

These credentials are for local development only and must never be used in production. Every account is linked to the fictional `SHWAI Demo Academy` school through an active membership; server-side school, role, and permission checks remain enabled.

### Start and preview

```bash
npm run dev
```

Open [http://localhost:8080](http://localhost:8080). Public routes such as `/`, `/login`, `/register`, `/pricing`, `/health`, and `/readiness` load without PostgreSQL. `/readiness` reports database-not-ready rather than pretending persistence works when no database URL is configured. With PostgreSQL migrated and seeded, log in through `/login` and preview the authenticated dashboard, portals, attendance, homework, notices, notifications, grading, intelligence, audit, AI governance, knowledge, prediction, import/export, privacy, and onboarding routes according to the selected account’s server-backed role and school membership.

If AI, email, storage, payment, or other provider credentials are absent, the application reports an explicit configuration-required state and does not fabricate success.

## V3 AI features

V3 uses a server-only provider abstraction in `src/lib/ai/provider.ts`. It supports model discovery, structured JSON generation, text generation, bounded timeouts, retries, request IDs, normalized provider errors, output-token metadata, and an explicit configuration-required error when no provider is available. The client never receives provider credentials or internal prompts.

Teachers can use `/app/ai/studio` to generate reviewable homework, worksheets, quizzes, question banks, answer-key assistance, lesson slides, activities, flashcards, study notes, revision sheets, and mind maps. `/app/ai/teacher-assistant` provides lesson plans, differentiated assignments, translations, report-card comment drafts, and parent-message drafts. Generated records are persisted as AI-labeled drafts; editing and explicit teacher approval are required before publication. `/app/ai/content-library` provides tenant-scoped review of generated resources.

Students can use `/app/ai/tutor` for student-safe Socratic help with five progressive hint levels and persisted session history. Student context is minimized to necessary academic fields. Practice generation and learning activity recording are server-side, and engagement awards are tied to actual persisted activity rather than opening the tutor or generating a prompt. Personalized learning uses recent observed grades and activity with deterministic adaptive-difficulty rules; it does not forecast future outcomes. Parents see only the limited, published study-note and revision-sheet visibility intended for family support, never private tutor conversations.

## V4 intelligence and automation

V4 adds a reusable, school-scoped intelligence layer in `src/actions/intelligence.ts` and `src/lib/intelligence/`. The deterministic signal engine compares compatible observation windows across persisted attendance, published grades, homework/submissions, and V3 learning events. It records data quality, evidence counts, explanations, confidence categories, alerts, recommendations, interventions, follow-ups, outcomes, escalation events, and intelligence-run metadata. Insufficient data is displayed as **Insufficient data** or **Not enough evidence** rather than converted into a fabricated score.

The V4 workspace is available at `/app/intelligence/early-warning`, `/app/intelligence/concepts`, `/app/intelligence/school`, `/app/intelligence/assistant`, and `/app/interventions`. Teachers and authorized staff can review evidence-backed alerts, acknowledge them, create human-owned interventions, schedule follow-ups, advance workflow status, and record measured outcomes. Leadership users can query aggregate school intelligence through the provider-backed assistant; numerical data is retrieved and calculated server-side, and arbitrary generated SQL is never executed.

V4 also adds explicit administrator-controlled concept and prerequisite records, student-safe observed progress summaries, parent-safe published progress and attendance summaries, parent acknowledgement and meeting-request workflows, AI usage aggregates, and an idempotent scheduled endpoint at `/api/intelligence/run`. The endpoint requires `x-shwai-intelligence-secret` and `SHWAI_INTELLIGENCE_CRON_SECRET`; it does not pretend that production scheduling exists when the deployment has no cron/job runner. Automation rules are persisted, audited, idempotent, permission-checked, and prevented from making high-impact decisions automatically.

V4 PostgreSQL tables include `hw_intelligence_runs`, `hw_intelligence_signals`, `hw_intelligence_alerts`, `hw_intelligence_evidence`, `hw_intelligence_recommendations`, `hw_interventions`, `hw_intervention_followups`, `hw_intervention_outcomes`, `hw_intelligence_reports`, `hw_intelligence_concepts`, `hw_intelligence_prerequisites`, `hw_parent_intelligence_acknowledgements`, `hw_parent_meeting_requests`, `hw_intelligence_automation_rules`, and `hw_intelligence_automation_runs`.

## V5 enterprise operations and decision intelligence

V5 adds persisted enterprise operations and decision workflows. The functional workspaces are available at `/app/operations`, `/app/decisions`, `/app/support`, and `/app/offline`. They cover admissions enquiries and applications, fee structures and manually recorded payment references, campus metadata, staff assignments, transport routes and events, library checkout/return, inventory stock protection, facilities maintenance, certificates, transparent scenarios, decision history, curriculum coverage, evidence-backed learning debt, intervention experiments, workload evidence, privacy-first context records, support requests, offline operations, and explicit provider-configuration states.

The V5 simulator calculates conflicts, students served, room utilization, teacher workload delta, remaining capacity, warnings, and trade-offs from explicit inputs on the server. It labels inputs as known, calculated, assumed, or unknown and will not estimate future academic performance. V5 AI assistance is limited to explaining server-calculated outputs through the existing server-only provider abstraction; it cannot calculate hidden numbers or make high-impact decisions.

V5 context records are human-created, consent-aware, visibility-controlled, expiring, and correctable. The application never infers medical, mental-health, disability, family, socioeconomic, or protected characteristics from academic or behavioral data. Help matching requires approved providers and human oversight. Offline mutations carry operation IDs and can be surfaced as conflicts for authorized manual resolution; low-data mode and voice-unsupported states are explicit.

External payment, GPS, SMS, WhatsApp, payroll, storage, translation, and 2FA integrations are provider boundaries. Without verified credentials and an end-to-end test, the application reports `configuration required` or `not verified` and never fabricates delivery, payment, live location, transcription, or synchronization success. See [`docs/v5-completion-report.md`](docs/v5-completion-report.md) for the 84-gate classification.

## V6 advanced AI and future intelligence

V6 adds governed AI foundations at `/app/ai/governance`, `/app/knowledge-base`, `/app/predictions`, `/app/ai/classroom-assistant`, and `/app/ai/learning-journeys`. `src/actions/v6.ts` provides authenticated, school-scoped server functions for AI provenance, output versions, approval events, approved-source knowledge retrieval, prediction records and evaluations, data-quality warnings, school AI settings, usage governance, classroom assistance, and persisted learning journeys.

AI-generated teacher content and student practice now retain V6 provenance records with request IDs, provider/model metadata, output versions, approval state, missing-data and bias-warning fields. Teacher edits create a human-edited replacement version, and publication records explicit approval. Generated content remains a draft until review; no client-side provider key is used.

The school knowledge base supports source registration, human approval, governed chunk ingestion, PostgreSQL text retrieval, and cited answers. Answers are restricted to approved, non-expired school sources and explicitly return `No approved school source was found` when retrieval finds no eligible evidence. The current implementation is a text-search foundation; vector embeddings, OCR, automatic document parsing, and external-drive ingestion are not claimed.

Prediction foundations persist requested type, scope, evidence summary, data-quality warnings, provider state, review state, and evaluation outcomes. If the minimum historical evidence is unavailable, the server returns `Prediction unavailable: insufficient historical data` and does not store a fabricated value. High-stakes predictions require human review and cannot automatically punish students, deny admissions, permanently label people, discipline teachers, or make irreversible decisions.

The classroom assistant uses approved school context and reports provider/source boundaries honestly. Learning journeys persist concepts, prerequisite gaps, practice, revision, and observed progress; they extend V3/V4 evidence and do not forecast future outcomes. V6 AI settings and usage governance are persisted and audited. Live PostgreSQL migration, authenticated browser workflows, vector/speech/OCR providers, production scheduling, and external operational integrations remain configuration or deployment requirements. See [`docs/v6-completion-report.md`](docs/v6-completion-report.md) for the COMPLETE / PARTIAL / CONFIGURATION_REQUIRED / BLOCKED / NOT_IMPLEMENTED matrix.

## Production readiness foundations

The repository now includes a real production-code foundation for school onboarding at `/app/onboarding`, authorized multi-school membership switching, one-time email verification, password recovery with session revocation, controlled invitations at `/accept-invitation`, server-enforced permissions, server-derived plan context, staged student CSV/JSON import at `/app/data-import`, bounded audited CSV/JSON export at `/app/data-export`, privacy request review at `/app/privacy`, owner system health and incident controls at `/app/system-health`, `/health` and `/readiness` probes, persistent idempotent job records, a secure job-runner boundary, names-only `.env.example`, and a GitHub Actions verification workflow.

These workflows are not claimed to be fully production-ready without deployment evidence. Email, private object storage, XLSX parsing, large background exports, durable workers, payment, SSO, Google/Microsoft education connectors, MFA providers, monitoring delivery, backups/PITR, restore testing, RLS review, WAF/DDoS controls, and production browser verification remain `CONFIGURATION REQUIRED`, `DEPLOYMENT REQUIRED`, `BLOCKED`, or `NOT VERIFIED`. Read [`docs/PRODUCTION_READINESS_REPORT.md`](docs/PRODUCTION_READINESS_REPORT.md), [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md), [`docs/INTEGRATIONS.md`](docs/INTEGRATIONS.md), and [`docs/BACKUP_AND_RECOVERY.md`](docs/BACKUP_AND_RECOVERY.md) before enabling a real school.

## AI provider configuration

Configure a supported server-side provider in the runtime environment. The built-in Forge-compatible provider uses:

```bash
BUILT_IN_FORGE_API_URL=https://...
BUILT_IN_FORGE_API_KEY=server-only-secret
```

The abstraction also recognizes the configured OpenAI-compatible `OPENAI_API_BASE` and `OPENAI_API_KEY` values for local server execution. Do not commit environment files, put keys in `VITE_*` variables, or call the provider from browser code. If provider configuration is absent, V3 deliberately returns a clear configuration-required state instead of fabricating AI output.

## V3 safety and usage controls

All V3 server functions derive identity, role, and school from the authenticated HTTP-only session. Server-side policy enforces student-versus-teacher feature permissions, tenant scoping, prompt safety checks, a 12,000-character input limit, an eight-request-per-minute per-user limit, a 2,000-request-per-school daily limit, bounded output tokens, usage records, audit records, and schema validation. The tutor does not expose unrelated personal data to the provider, and stored source material is treated as data rather than executable instructions.

## Structure

```text
src/
  app/providers/       authenticated app state plus non-sensitive preferences
  components/ui/       shadcn primitives
  components/feedback/ retryable, empty, permission, and feature-locked states
  components/v3/       AI Content Studio and student AI Tutor
  components/v4/       Intelligence, alerts, concept map, school dashboard, and interventions
  components/v5/       Enterprise operations, decision intelligence, support, and offline workspaces
  components/v6/       AI governance, knowledge, predictions, classroom assistance, and learning journeys
  config/               navigation.ts, roles.ts, plans.ts
  data/mock/            demonstration datasets for non-persisted screens
  actions/              TanStack Start server functions for persisted workflows
  lib/ai/               provider abstraction, schemas, policy, and V3 tests
  lib/intelligence/     deterministic V4 thresholds, evidence policy, and tests
  lib/v5/               transparent scenario engine, workload calculations, and V5 policy tests
  lib/v6/               V6 policy helpers and governance tests
  lib/                  database, access policy, timeout, and error helpers
  routes/               file-based routes for the app shell and V1–V6 modules
  scripts/              PostgreSQL schema migration
  docs/                 version and production-readiness reports/runbooks
```

## Mock data and services

Deterministic datasets under `src/data/mock` remain for demonstration and empty-state testing only. Persisted workflows use server functions under `src/actions` and PostgreSQL tables created by `scripts/migrate.ts`. When database or provider configuration is absent, the UI shows a retryable configuration/error state instead of a fake success. File bytes and external Google, email, SMS, and other delivery providers remain provider-dependent and are not faked.

## Role-based navigation and authentication

`src/config/navigation.ts` declares every module with `roles` and an optional `plan`; the sidebar, command palette, and mobile navigation derive from it. The server derives `user → school → membership → role → plan` from the HTTP-only session cookie. The browser cannot invent a role or school; it may switch only among active server-authorized memberships through session rotation. Passwords use PBKDF2-SHA-256 and sessions expire after eight hours. Production deployment still requires PostgreSQL, TLS, secret rotation, monitoring, and an operational identity lifecycle.

## Subscription feature gating

`src/config/plans.ts` defines Starter, Professional, and Enterprise feature gates. `planAllows(current, required)` drives locked-feature states and upgrade prompts. V3 AI routes are marked Professional in navigation, while database and provider availability remain infrastructure requirements rather than simulated plan entitlements.

## Verification boundary

V1, V2, V3, V4, V5, and V6 policy/regression tests are included in the suite. V4 tests cover observed decline thresholds, insufficient-data handling, confidence categories, parent-safe fields, role boundaries, escalation hierarchy, and automation idempotency. V5 tests cover transparent scenario calculations, unknown future outcomes, workload thresholds, role/capability boundaries, context visibility, sensitive-inference rejection, provider states, fee status, and negative-inventory protection. V6 tests cover governance roles, approval transitions, approved-source boundaries, insufficient-data prediction safeguards, data-quality warnings, and provider states. The V1–V6 implementation is statically type-checked, linted, tested, and built locally; live PostgreSQL migration, seeded-data browser verification, provider end-to-end tests, production scheduled jobs, vector/OCR/speech services, 2FA, export/deletion execution, and several document/messaging integrations require deployment infrastructure. See [`docs/v6-completion-report.md`](docs/v6-completion-report.md) for the V6 completion matrix and exact release boundary.
