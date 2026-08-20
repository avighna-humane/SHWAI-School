# SHWAI deployment runbook

## Deployment classification

The repository is **STAGING-CANDIDATE CODE — DEPLOYMENT VERIFICATION REQUIRED**, not production-ready or sellable. A deployment owner must provide a separate staging environment, managed PostgreSQL, private object storage, malware scanning, email provider, secret manager, durable worker, monitoring, backups, and restore evidence before onboarding a real school.

## Environment separation

Development, staging, and production must use separate databases, storage buckets, provider credentials, OAuth clients, and secrets. Never copy a production dump into a developer environment. Staging must use synthetic or explicitly de-identified school data and provider sandbox accounts.

## Required secrets

Populate the names in `.env.example` through a deployment secret manager. Database credentials, `MFA_ENCRYPTION_KEY`, provider API keys, webhook secrets, scanner credentials, backup credentials, and cron/job secrets must never be committed or exposed to the browser. Production PostgreSQL must use TLS. `PUBLIC_APP_URL` must be the canonical HTTPS origin used in verification, reset, and invitation links.

## Release sequence

1. Build the immutable application artifact from the reviewed commit.
2. Run `npm run check`, `npm test -- --run`, focused lint, `npm audit --omit=dev --audit-level=high`, `npm run build`, and `git diff --check`.
3. Confirm a backup exists, then apply the additive migration to staging with `npm run db:migrate` and inspect migration output.
4. Start one durable `npm run worker` process or configure a platform scheduler for `/api/jobs/run` with `SHWAI_JOB_RUNNER_SECRET`.
5. Run authenticated staging smoke tests for registration, email verification, login, MFA, invitations, school switching, onboarding, import preview/commit, queued export/download, private document upload/scan/download/delete, privacy requests, attendance, homework, grading, notifications, password/session management, and logout.
6. Verify `/health`, `/ready`, and `/readiness`; readiness must report database ready and must not expose secrets.
7. Run provider connection tests and confirm that unconfigured providers remain visibly unavailable. Verify storage access is private and that a document with a non-clean scan cannot download.
8. Take or confirm a managed backup before production migration. Apply additive migrations first; destructive changes require an approved restore plan.
9. Deploy the application and worker, then observe authentication failures, database latency, job retries/dead letters, provider errors, storage failures, billing failures, and monitoring delivery.
10. If checks fail, stop rollout and roll back the application artifact. Do not blindly roll back an irreversible database migration; restore or forward-fix using the approved recovery plan.

## Health semantics

`/health` reports process availability without dependency details. `/ready` and `/readiness` execute a bounded PostgreSQL health query and return HTTP 503 when the database is not ready. They do not expose connection strings, SQL, stack traces, bucket URLs, scanner credentials, or provider secrets.

## Worker semantics

The worker claims jobs with `FOR UPDATE SKIP LOCKED`, records a five-minute lease, recovers expired leases, retries transient failures using bounded exponential backoff, supports cancellation flags, and moves permanent/exhausted jobs to `dead_letter`. It currently processes cleanup, private exports, and queued email deliveries. Deployment must provide durable process hosting and alerting for dead letters; the repository cannot prove those external properties.

## Rollback and degraded operation

AI, email, payment, storage, scanner, and external education providers are non-core dependencies until proven otherwise. If one fails, preserve in-app operational records, mark delivery/provider state failed or configuration-required, and retry through the job system where appropriate. Never convert an unavailable external result into a success state. Private documents remain blocked until storage and scanner configuration is healthy.

## Production blockers

The repository cannot verify DNS/TLS certificates, managed database availability, RLS, managed backups/PITR, restore testing against provider infrastructure, object-storage bucket policy, malware scanning, email deliverability, OAuth tenants, payment checkout, distributed rate limits, durable hosting, Sentry/OpenTelemetry delivery, WAF/DDoS, or real multi-role browser flows in this sandbox. These remain explicit deployment gates.
