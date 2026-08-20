# SHWAI production setup

**Status:** Deployment runbook. This document describes repository behavior and required external configuration; it does not claim that any provider or deployment is active.

## Application prerequisites

Use Node.js 22 or newer, npm, PostgreSQL 14 or newer, and a deployment environment that can run the TanStack Start/Vite server. Configure HTTPS, DNS, secret storage, and a private PostgreSQL connection before onboarding a real school.

## Required environment boundary

Copy `.env.example` into a deployment-specific secret store or local `.env`. Do not commit `.env` files. `DATABASE_URL` or `SUPABASE_DATABASE_URL` is required for all persisted workflows. Production also requires `NODE_ENV=production`, an explicit `PUBLIC_APP_URL`, and explicit `SHWAI_TRUSTED_ORIGINS` values.

| Variable group  | Variables                                                                                                      | Status                                                                                  |
| --------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Process and URL | `NODE_ENV`, `APP_VERSION`, `PUBLIC_APP_URL`, `SHWAI_TRUSTED_ORIGINS`                                           | Required for an explicit deployment boundary.                                           |
| Database        | `DATABASE_URL` or `SUPABASE_DATABASE_URL`                                                                      | Required for auth, migrations, and persistence.                                         |
| Job boundary    | `SHWAI_INTELLIGENCE_CRON_SECRET`, `SHWAI_JOB_RUNNER_SECRET`                                                    | Required when scheduled intelligence or job processing is enabled.                      |
| Email           | `EMAIL_PROVIDER_URL`, `EMAIL_PROVIDER_API_KEY`, `EMAIL_FROM`                                                   | Provider-dependent; verification, reset, and invitations remain unavailable without it. |
| AI              | `BUILT_IN_FORGE_API_URL` and `BUILT_IN_FORGE_API_KEY`, or the documented OpenAI-compatible alternatives        | Provider-dependent; AI requests fail closed when absent.                                |
| Storage         | `STORAGE_PROVIDER`, `STORAGE_ENDPOINT`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY` | Provider-dependent; private object-storage workflows require a configured adapter.      |
| Billing         | `PAYMENT_PROVIDER`, `PAYMENT_API_KEY`, `PAYMENT_WEBHOOK_SECRET`                                                | Provider-dependent; the repository does not claim live payment processing.              |
| Observability   | `SENTRY_DSN` or `OTEL_EXPORTER_OTLP_ENDPOINT`                                                                  | Required for production monitoring operations.                                          |

## Database provisioning and migrations

Provision a private PostgreSQL database with TLS, backups, and a documented restore process. Apply the idempotent schema migration from the application release:

```bash
npm ci
npm run db:migrate
```

Migration execution must be recorded by the deployment pipeline. Do not run the development seed against production. `npm run db:seed:dev` is guarded by `NODE_ENV=development` and creates only fictional SHWAI Demo Academy records.

## Readiness gates

The HTTP probes are `/health`, `/ready`, and the backward-compatible `/readiness`. `/health` confirms process responsiveness. `/ready` and `/readiness` query PostgreSQL and return HTTP 503 with a non-sensitive `database: not_ready` dependency state when persistence is unavailable.

The deployment gate is:

```bash
npm run readiness:check
```

It prints JSON states of `READY`, `WARNING`, `CONFIGURATION_REQUIRED`, or `BLOCKED` and exits nonzero unless every check is ready. A `READY` state means only that the specific check passed; it does not prove backups, legal approval, staging browser verification, or provider delivery.

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

The deployment owner must configure HTTPS certificates, DNS, private database networking, secret rotation, backup retention, point-in-time recovery where supported, restore drills, a durable worker for queued jobs, email domain verification, private object storage and malware-scanning policy, payment webhooks if billing is enabled, monitoring/alerts, incident ownership, and data-processing/legal review. None of those external controls is inferred from the presence of source code alone.
