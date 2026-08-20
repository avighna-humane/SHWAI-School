# SHWAI production setup

**Status:** Deployment runbook. This document describes repository behavior and required external configuration; it does not claim that any provider or deployment is active.

## Application prerequisites

Use Node.js 22 or newer, npm, PostgreSQL 14 or newer, `pg_dump`/`pg_restore`, and a deployment environment that can run the TanStack Start/Vite server plus one durable worker process. Configure HTTPS, DNS, secret storage, and a private PostgreSQL connection before onboarding a real school.

## Required environment boundary

Copy `.env.example` into a deployment-specific secret store or local `.env`. Do not commit `.env` files. `DATABASE_URL` or `SUPABASE_DATABASE_URL` is required for all persisted workflows. Production also requires `NODE_ENV=production`, an explicit HTTPS `PUBLIC_APP_URL`, explicit `SHWAI_TRUSTED_ORIGINS` values, and `MFA_ENCRYPTION_KEY` before TOTP enrollment.

| Variable group   | Variables                                                                                                                        | Status                                                                                                                   |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Process and URL  | `NODE_ENV`, `APP_VERSION`, `PUBLIC_APP_URL`, `SHWAI_TRUSTED_ORIGINS`                                                             | Required for an explicit HTTPS deployment boundary.                                                                      |
| Authentication   | `MFA_ENCRYPTION_KEY`                                                                                                             | Required in production before TOTP enrollment; use a rotated secret-manager value.                                       |
| Database         | `DATABASE_URL` or `SUPABASE_DATABASE_URL`                                                                                        | Required for auth, migrations, and persistence.                                                                          |
| Job boundary     | `SHWAI_INTELLIGENCE_CRON_SECRET`, `SHWAI_JOB_RUNNER_SECRET`, `SHWAI_WORKER_POLL_MS`                                              | Required when scheduled intelligence or worker processing is enabled.                                                    |
| Email            | `EMAIL_PROVIDER_URL`, `EMAIL_PROVIDER_API_KEY`, `EMAIL_FROM`                                                                     | Provider-dependent; verification, reset, invitations, and queued delivery remain unavailable without it.                 |
| Storage          | `STORAGE_PROVIDER`, `STORAGE_ENDPOINT`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_REGION` | Required for private signed objects. Local filesystem storage is not accepted for production documents.                  |
| Malware scanning | `MALWARE_SCANNER_URL`, `MALWARE_SCANNER_API_KEY`                                                                                 | Required before user documents become downloadable; the application fails closed while scan status is not clean.         |
| AI               | `BUILT_IN_FORGE_API_URL` and `BUILT_IN_FORGE_API_KEY`, or OpenAI-compatible alternatives                                         | Provider-dependent; AI requests fail closed when absent.                                                                 |
| Billing          | `PAYMENT_PROVIDER`, `PAYMENT_API_KEY`, `PAYMENT_WEBHOOK_SECRET`                                                                  | Required for the signed webhook boundary; checkout and provider sandbox evidence remain separate blockers.               |
| Backups          | `BACKUP_PROVIDER`, `BACKUP_BUCKET`, `BACKUP_RETENTION_DAYS`, provider credentials                                                | Required to configure managed backup storage; readiness remains warning until actual backup and restore evidence exists. |
| Observability    | `SENTRY_DSN` or `OTEL_EXPORTER_OTLP_ENDPOINT`                                                                                    | Required for production monitoring operations.                                                                           |

## Database provisioning and migrations

Provision a private PostgreSQL database with TLS, pooling, managed backups/PITR, and a documented restore process. Apply the idempotent schema migration from the application release:

```bash
npm ci
npm run db:migrate
```

Migration execution must be recorded by the deployment pipeline. Do not run the development seed against production. `npm run db:seed:dev` is guarded by `NODE_ENV=development` and creates only fictional SHWAI Demo Academy records.

## Private storage and documents

Use a private S3-compatible bucket with public ACLs disabled, encryption, lifecycle expiry, and provider access logging. The server creates tenant-prefixed keys, signs PUT/GET/DELETE operations, applies MIME/extension/name/size validation, and writes access/audit records. A document remains unavailable until the configured malware scanner returns `clean`. Provider credentials, scanner behavior, bucket policy, and restore evidence are external deployment requirements.

## Worker and scheduled jobs

The worker command is:

```bash
npm run worker
```

It uses `hw_jobs` leases, `FOR UPDATE SKIP LOCKED`, cancellation flags, retry backoff, and `dead_letter` state. It currently processes cleanup, private exports, and queued email deliveries. Run one durable worker process per deployment environment or invoke the authenticated `/api/jobs/run` endpoint from a platform scheduler. Do not run only the HTTP endpoint without an actual durable scheduler/worker arrangement. Worker crash recovery and provider outage behavior must be verified in staging.

## Backup and restore verification

Create a custom-format PostgreSQL backup with retention cleanup:

```bash
npm run db:backup
```

The command requires `BACKUP_OUTPUT_DIR` in production and `BACKUP_PROVIDER`/retention settings. It does not replace managed PITR or provider backup monitoring. Verify an isolated restore with:

```bash
RESTORE_DATABASE_URL='postgresql://isolated-restore-db' \
RESTORE_DUMP_PATH='/secure/path/shwai-YYYY-MM-DD.dump' \
npm run db:restore:test
```

The restore command refuses to target the primary production URL in production, runs `pg_restore --exit-on-error`, checks for core/session/storage tables, and emits a verification record. A successful local command is not evidence of managed backup retention, PITR, or a completed production drill.

## Readiness gates

The HTTP probes are `/health`, `/ready`, and the backward-compatible `/readiness`. `/health` confirms process responsiveness. `/ready` and `/readiness` query PostgreSQL and return HTTP 503 with a non-sensitive `database: not_ready` dependency state when persistence is unavailable. The schema readiness check includes MFA, billing, storage, and session tables.

The deployment gate is:

```bash
npm run readiness:check
```

It prints JSON states of `READY`, `WARNING`, `CONFIGURATION_REQUIRED`, or `BLOCKED` for database, migrations, authentication, MFA, email, storage, AI, billing, worker, monitoring, backups, security, trusted origins, HTTPS, and environment. It exits nonzero unless every check is ready. A `READY` state means only that the specific check passed; it does not prove backups, legal approval, staging browser verification, or provider delivery.

## Release verification

Run the following before promotion:

```bash
npm run check
npm test -- --run
npm run lint
npm run build
npm audit --omit=dev --audit-level=high
git diff --check
npm run readiness:check
```

After deployment, run the public health probes and a staging-only authenticated browser matrix using fictional or approved test data. Never use the local demo password or fictional seed identities in production.

## External operational requirements

The deployment owner must configure HTTPS certificates, DNS, private database networking, secret rotation, backup retention, point-in-time recovery where supported, restore drills, a durable worker, email domain verification, private object storage and malware-scanning policy, payment webhooks if billing is enabled, monitoring/alerts, incident ownership, and data-processing/legal review. None of those external controls is inferred from the presence of source code alone.
