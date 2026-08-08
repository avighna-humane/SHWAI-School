# SHWAI — AI-Native School Operating System (Frontend Demo)

Frontend-only React 19 + TypeScript + Vite app. No backend, no real auth, no payments, no live AI — everything runs in the browser with realistic mock data.

## Stack

- **React 19** + TypeScript
- **Vite 8** (with `@lovable.dev/vite-tanstack-config`)
- **TanStack Router / Start** (file-based routing)
- **Tailwind CSS v4** + **shadcn/ui** (Radix primitives)
- **Recharts** + **TanStack Table** + **Framer Motion**

## How to run

```bash
bun install
bun run dev   # served at port 5000 via the "Start application" workflow
```

The Replit workflow `Start application` runs `bun run dev -- --host 0.0.0.0 --port 5000` automatically.

## Project structure

```
src/
  app/providers/     demo app state (role, school, year, plan, language, offline, notifications)
  components/ui/     shadcn primitives
  components/feedback/  empty / error / loading / permission-denied / feature-locked states
  config/            navigation.ts (RBAC nav), roles.ts, plans.ts (feature gates)
  data/mock/         deterministic (seeded) mock datasets
  services/mock/     async mock service layer — replace with fetch() to go live
  types/             TypeScript interfaces for every entity
  routes/            file-based routes (landing, pricing, /app shell + modules)
```

## Key conventions

- **Read-only mock data** (arrays, constants) is imported directly from `src/data/mock/` in routes and providers.
- **Writes and mutations** go through `mockService.*` in `src/services/mock/index.ts`, which returns promises with simulated latency. To connect a real backend, replace each function body there with a `fetch()` call — component code stays unchanged.
- Role-based navigation is config-driven via `src/config/navigation.ts` — adding a module only requires a new entry there.
- Subscription feature gating uses `planAllows(current, required)` from `src/config/plans.ts`.
- `localStorage` persists only demo state (role, school, plan, read notifications).

## Package manager

This project uses **Bun** (lockfile: `bun.lock`). Run `bun install` for a clean install. The dev script (`npm run dev`) works with both npm and bun.

## User preferences

<!-- Record user preferences here as they are expressed. -->
