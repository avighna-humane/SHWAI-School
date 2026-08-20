# SHWAI localhost audit

**Audit date:** 2026-08-20
**Repository:** `avighna-humane/SHWAI-School`
**Branch:** `main`

## Current architecture

SHWAI is a React 19 + TypeScript application using Vite, TanStack Start/Router, React Query, Tailwind, server functions, and PostgreSQL through the `postgres` client. File-based routes live in `src/routes`; the generated route tree is `src/routeTree.gen.ts`. Authentication uses PBKDF2 password hashes, HTTP-only sessions, active school memberships, and server-derived role/plan context. The migration runner is `scripts/migrate.ts`, invoked by `npm run db:migrate`.

## Local command

The repository’s intended local command is `npm run dev`, which runs `vite dev`. The project scaffold supplies the localhost development port through the Vite/TanStack configuration; the running sandbox instance is reachable at `http://127.0.0.1:8080`.

## Findings

| Surface | Finding | Impact | Required treatment |
| --- | --- | --- | --- |
| Dev server | `npm run dev` exists and current server reaches port 8080. | Startup path is valid. | Preserve existing command; document `http://localhost:8080`. |
| Build/check | `npm run check`, `npm run build`, and tests are available. | Reproducible code verification exists. | Add a safe `db:seed` command and run all checks after changes. |
| Environment | `.env.example` exists but does not include an explicit `JWT_SECRET` compatibility placeholder or a clear public/server-only split. | Developers may miss required server variables. | Expand comments and add development guidance without real secrets. |
| Database | `requireDatabase()` correctly fails with an actionable message when no URL is configured. `db:migrate` fails clearly when no URL is configured. | Persistent pages cannot work without PostgreSQL. | Preserve fail-closed behavior; add safe fictional seed SQL/script requiring a configured DB. |
| Authentication | Registration/login/verification/recovery are real DB-backed flows. Local seeded accounts need verified users, memberships, sessions through the actual login flow, and an email-free development path that is explicitly development-only. | Without a dev-only verified-account mechanism, local role preview is blocked by email provider configuration. | Add a `NODE_ENV=development`-guarded seed only; authenticate through normal login, never bypass session checks. |
| URL generation | Auth email links fall back to `http://localhost:3000`, while the dev server is 8080. | Local verification/recovery/invitation links point to the wrong port. | Derive public URL from `PUBLIC_APP_URL`, defaulting to `http://localhost:8080` in development. |
| Routes | V1–V6 file routes and catch-all workspaces exist; generated route tree is tracked and must be rebuilt after new route changes. | Preview can be meaningful if route errors and auth boundary are verified. | Verify public/protected routes; do not redesign or replace mocks. |
| Seed data | No `db:seed` script or safe fictional seed runner was found in package scripts. | No reproducible authenticated role preview exists. | Add idempotent development-only seed with fictional SHWAI Demo Academy data. |
| Error handling | DB absence is represented as an actionable error in persistent paths; AI/email providers already expose configuration-required states. | Missing infrastructure should not show false success. | Verify loading/error/empty/retry states; avoid weakening fail-closed behavior. |
| Security | Request origin/header/session controls are already implemented. | Local convenience must not weaken production security. | Keep role, school, membership, permission, and tenant checks unchanged. |

## Scope decision

Only localhost execution, safe development seed/auth workflow, environment documentation, and verification will be changed. No new product feature or UI redesign will be introduced. Existing mock/demo workspaces remain as-is where the repository already classifies them as demonstration data; persisted workflows remain database-dependent.
