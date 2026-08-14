# SHWAI School Management Platform

React 19 + TypeScript + Vite application using TanStack Router/Start, Tailwind v4, shadcn/ui, Recharts, TanStack Table, Framer Motion, TanStack Start server functions, and PostgreSQL persistence where configured. The repository contains an authenticated V1 foundation, a V2 academic-core slice, and a V3 AI Learning + AI Content + AI Teacher Assistance slice. No V4 early-warning/prediction, V5 enterprise operations, or V6 advanced governance/career intelligence is included in V3.

## Run

```bash
npm install
npm run dev      # http://localhost:8080
npm run check
npm test
npm run build
npm run db:migrate # requires DATABASE_URL or SUPABASE_DATABASE_URL
```

## V3 AI features

V3 uses a server-only provider abstraction in `src/lib/ai/provider.ts`. It supports model discovery, structured JSON generation, text generation, bounded timeouts, retries, request IDs, normalized provider errors, output-token metadata, and an explicit configuration-required error when no provider is available. The client never receives provider credentials or internal prompts.

Teachers can use `/app/ai/studio` to generate reviewable homework, worksheets, quizzes, question banks, answer-key assistance, lesson slides, activities, flashcards, study notes, revision sheets, and mind maps. `/app/ai/teacher-assistant` provides lesson plans, differentiated assignments, translations, report-card comment drafts, and parent-message drafts. Generated records are persisted as AI-labeled drafts; editing and explicit teacher approval are required before publication. `/app/ai/content-library` provides tenant-scoped review of generated resources.

Students can use `/app/ai/tutor` for student-safe Socratic help with five progressive hint levels and persisted session history. Student context is minimized to necessary academic fields. Practice generation and learning activity recording are server-side, and engagement awards are tied to actual persisted activity rather than opening the tutor or generating a prompt. Personalized learning uses recent observed grades and activity with deterministic adaptive-difficulty rules; it does not forecast future outcomes. Parents see only the limited, published study-note and revision-sheet visibility intended for family support, never private tutor conversations.

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
  config/               navigation.ts, roles.ts, plans.ts
  data/mock/            demonstration datasets for non-persisted screens
  actions/              TanStack Start server functions for persisted workflows
  lib/ai/               provider abstraction, schemas, policy, and V3 tests
  lib/                  database, access policy, timeout, and error helpers
  routes/               file-based routes for the app shell and V1–V3 modules
  scripts/              PostgreSQL schema migration
  docs/                 version completion reports
```

## Mock data and services

Deterministic datasets under `src/data/mock` remain for demonstration and empty-state testing only. Persisted workflows use server functions under `src/actions` and PostgreSQL tables created by `scripts/migrate.ts`. When database or provider configuration is absent, the UI shows a retryable configuration/error state instead of a fake success. File bytes and external Google, email, SMS, and other delivery providers remain provider-dependent and are not faked.

## Role-based navigation and authentication

`src/config/navigation.ts` declares every module with `roles` and an optional `plan`; the sidebar, command palette, and mobile navigation derive from it. The server derives `user → school → membership → role` from the HTTP-only session cookie, so the browser cannot select an active role or school. Passwords use PBKDF2-SHA-256 and sessions expire after eight hours. Production deployment still requires PostgreSQL, TLS, secret rotation, monitoring, and an operational identity lifecycle.

## Subscription feature gating

`src/config/plans.ts` defines Starter, Professional, and Enterprise feature gates. `planAllows(current, required)` drives locked-feature states and upgrade prompts. V3 AI routes are marked Professional in navigation, while database and provider availability remain infrastructure requirements rather than simulated plan entitlements.

## Verification boundary

V1 and V2 regression tests remain in the suite. V3 policy tests cover role authorization, cross-school rejection, prompt safety, input limits, per-minute and daily rate limits, context minimization, and structured-output validation. See [`docs/v3-completion-report.md`](docs/v3-completion-report.md) for the feature-by-feature implementation, verification, infrastructure blockers, and strict V3 boundary.
