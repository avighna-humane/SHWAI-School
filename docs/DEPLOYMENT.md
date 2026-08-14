# SHWAI deployment runbook

## Deployment classification

The repository is **PRODUCTION-CODE READY — DEPLOYMENT VERIFICATION REQUIRED**, not production-ready. A deployment owner must provide a separate staging environment, managed PostgreSQL, private object storage, email provider, secret manager, job worker, monitoring, backups, and restore evidence before onboarding a real school.

## Environment separation

Development, staging, and production must use separate databases, storage buckets, provider credentials, OAuth clients, and secrets. Never copy a production dump into a developer environment. Staging must use synthetic or explicitly de-identified school data and provider sandbox accounts.

## Required secrets

Populate the names in `.env.example` through a deployment secret manager. `SESSION_SECRET`, database credentials, provider API keys, webhook secrets, and cron/job secrets must never be committed or exposed to the browser. Production PostgreSQL must use TLS. `PUBLIC_APP_URL` must be the canonical HTTPS origin used in verification, reset, and invitation links.

## Release sequence

1. Build the immutable application artifact from the reviewed commit.
2. Run `npm run check`, `npm test -- --run`, focused lint, `npm audit --omit=dev --audit-level=high`, `npm run build`, and `git diff --check`.
3. Apply the migration to staging with `npm run db:migrate` and inspect migration output.
4. Run authenticated staging smoke tests for registration, email verification, login, invitations, school switching, onboarding, import preview/commit, export, privacy requests, attendance, homework, grading, notifications, and logout.
5. Verify `/health` and `/readiness`; readiness must report database ready.
6. Run provider connection tests and confirm that unconfigured providers remain visibly unavailable.
7. Take or confirm a backup before production migration. Apply additive migrations first; destructive changes require a separately approved migration and rollback/restore plan.
8. Deploy the application and worker, then run health/readiness probes and observe authentication failures, database latency, job failures, and provider errors.
9. If checks fail, stop rollout and roll back the application artifact. Do not blindly roll back an irreversible database migration; restore or forward-fix using the approved recovery plan.

## Health semantics

`/health` reports process availability without dependency details. `/readiness` executes a bounded `SELECT 1` and returns HTTP 503 when the database is not ready. It does not expose connection strings, SQL, stack traces, or provider credentials.

## Rollback and degraded operation

AI, email, SMS, WhatsApp, GPS, payment, storage, and external education providers are non-core dependencies until proven otherwise. If one fails, preserve in-app operational records, mark delivery/provider state failed or configuration-required, and retry through the job system. Never convert an unavailable external result into a success state.

## Production blockers

The following cannot be verified in this repository sandbox: DNS/TLS, managed database availability, RLS, backups/PITR, restore testing, object-storage private access, email deliverability, OAuth tenants, payment webhooks, Redis/distributed rate limits, worker durability, Sentry/OpenTelemetry, WAF/DDoS, and real multi-role browser flows. These remain deployment gates.
