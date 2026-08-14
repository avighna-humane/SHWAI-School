# SHWAI — The AI-Native School Operating System (frontend demo)

React 19 + TypeScript + Vite app using TanStack Router/Start, Tailwind v4, shadcn/ui,
Recharts, TanStack Table, Framer Motion, TanStack Start server functions, and PostgreSQL persistence where configured.
The repository contains an authenticated V1 foundation with PostgreSQL-backed identity, school memberships, server-derived roles, tenant-scoped people, academic structure, homework, submissions, grading, notices, notifications, chat, attendance, audit events, leave, calendar, document metadata, ID-card records, and alumni transitions. AI/operations integrations remain configuration-required unless enabled in the runtime.

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
  app/providers/     authenticated app state plus non-sensitive user preferences
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
Authentication is available at `/login` and `/register`. The server derives `user → school → membership → role` from the HTTP-only session cookie; the client no longer controls the active role or school. Passwords are PBKDF2-SHA-256 hashed and sessions expire after eight hours. A production deployment must still provide PostgreSQL, TLS, secret rotation, monitoring, and an operational identity lifecycle.

## Subscription feature gating

`src/config/plans.ts` defines Starter / Professional / Enterprise AI, the comparison matrix, usage
limits and mock invoices. `planAllows(current, required)` drives locked-feature states and upgrade
prompts. Switch plans on `/app/subscription` to see modules lock and unlock live.

## Functional completion boundary

V1 services now include authenticated identity and membership, tenant-scoped people and academic structure, homework/submissions/grading, notices with application-level notifications, chat, attendance, audit events, leave requests, calendar events, document metadata, ID-card records, and alumni transitions. V1 service calls fail explicitly when PostgreSQL is unavailable; they do not silently simulate a successful write. File bytes still require a production storage provider, and email/push/SMS delivery is intentionally not faked. The remaining V2–V6 surfaces are outside this task and remain demo or configuration-required by design.
