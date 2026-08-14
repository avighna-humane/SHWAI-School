# SHWAI — The AI-Native School Operating System (frontend demo)

React 19 + TypeScript + Vite app using TanStack Router/Start, Tailwind v4, shadcn/ui,
Recharts, TanStack Table, Framer Motion, TanStack Start server functions, and PostgreSQL persistence where configured.
The repository contains a real persisted vertical slice for homework, submissions, grading, notices, chat, attendance, and audit events. It still uses an explicit demo identity layer rather than production authentication, and AI/operations integrations remain configuration-required unless enabled in the runtime.

## Run

```bash
npm install
npm run dev      # http://localhost:8080
npm run check
npm test
npm run build
npm run db:migrate # requires DATABASE_URL or SUPABASE_DATABASE_URL
```

## Structure

```
src/
  app/providers/     demo app state (role, school, year, plan, language, offline, notifications)
  components/ui      shadcn primitives
  components/feedback  empty / error / loading / permission-denied / feature-locked states
  config/            navigation.ts (config-driven nav), roles.ts (RBAC), plans.ts (feature gates)
  data/mock/         core, people, academics, operations, intelligence, support, platform datasets
  actions/            TanStack Start server functions for persisted workflows
  lib/                database, access-policy, timeout, and error helpers
  services/mock/      demo-only datasets and simulated fallback services
  types/              TypeScript interfaces for every entity
  scripts/            PostgreSQL schema migration
  routes/             file-based routes (landing, pricing, /app shell + modules)
```

## Mock data & services

Deterministic datasets under `src/data/mock` are retained for demonstration and empty-state testing only. Persisted workflows use server functions under `src/actions` and PostgreSQL tables created by `scripts/migrate.ts`. The attendance workflow records one row per school, student, and date and writes an audit event for every saved register. When database configuration is absent or a service does not respond, the UI shows a retryable configuration/error state instead of a fake success.

## Role-based navigation

`src/config/navigation.ts` declares every module with `roles` and an optional `plan`. The sidebar,
command palette and mobile bar are all generated from it, so a role only sees its own modules.
Switch role from the avatar menu in the top bar to exercise the demo identity boundary. This is not production authentication; server operations still validate role capability and school scope, while a real identity provider and membership tables remain deployment requirements.

## Subscription feature gating

`src/config/plans.ts` defines Starter / Professional / Enterprise AI, the comparison matrix, usage
limits and mock invoices. `planAllows(current, required)` drives locked-feature states and upgrade
prompts. Switch plans on `/app/subscription` to see modules lock and unlock live.

## Functional completion boundary

Homework, submissions, grading, notices, chat, attendance, and audit-event writes are implemented through server functions and require PostgreSQL configuration. The remaining V1–V6 modules continue to use deterministic demo records or explicit configuration-required states. AI responses, provenance, predictions, GPS tracking, SMS/WhatsApp delivery, payments, exports, printing, scheduled jobs, and production authentication are not claimed as live until their providers and server infrastructure are configured and verified.
