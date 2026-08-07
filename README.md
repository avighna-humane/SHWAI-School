# SHWAI — The AI-Native School Operating System (frontend demo)

Frontend-only React 19 + TypeScript + Vite app (TanStack Router/Start, Tailwind v4, shadcn/ui,
Recharts, TanStack Table, Framer Motion). **No backend, no real auth, no payments, no live AI.**

## Run

```bash
npm install
npm run dev      # http://localhost:8080
```

## Structure

```
src/
  app/providers/     demo app state (role, school, year, plan, language, offline, notifications)
  components/ui      shadcn primitives
  components/feedback  empty / error / loading / permission-denied / feature-locked states
  config/            navigation.ts (config-driven nav), roles.ts (RBAC), plans.ts (feature gates)
  data/mock/         core, people, academics, operations, intelligence, support, platform datasets
  services/mock/     async mock service layer (simulated latency, failures, mutations)
  types/             TypeScript interfaces for every entity
  routes/            file-based routes (landing, pricing, /app shell + modules)
```

## Mock data & services

All datasets are deterministic (seeded) TypeScript modules under `src/data/mock`. UI never imports
raw arrays for writes — it calls `mockService.*` in `src/services/mock/index.ts`, which returns
promises after a simulated delay. To go live, replace each function body with a `fetch()`; component
code stays unchanged. `localStorage` persists only demo state (role, school, plan, read notifications).

## Role-based navigation

`src/config/navigation.ts` declares every module with `roles` and an optional `plan`. The sidebar,
command palette and mobile bar are all generated from it, so a role only sees its own modules.
Switch role from the avatar menu in the top bar (demo only — there is no authentication).

## Subscription feature gating

`src/config/plans.ts` defines Starter / Professional / Enterprise AI, the comparison matrix, usage
limits and mock invoices. `planAllows(current, required)` drives locked-feature states and upgrade
prompts. Switch plans on `/app/subscription` to see modules lock and unlock live.

## Mock-only by design

AI responses, provenance, predictions, GPS tracking, SMS/WhatsApp delivery, payments, exports,
printing and sync are all simulated in the browser.
