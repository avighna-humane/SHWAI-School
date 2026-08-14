# SHWAI environment variables

`.env.example` contains names only. Use a secret manager in staging and production; never commit values or expose server secrets through client bundles.

| Variable group | Variables | Required state |
| --- | --- | --- |
| Runtime | `NODE_ENV`, `APP_VERSION`, `PUBLIC_APP_URL` | `PUBLIC_APP_URL` must be canonical HTTPS in production. |
| Database | `DATABASE_URL`, `SUPABASE_DATABASE_URL` | One must be present; production TLS, pooling, backup, and restore are deployment gates. |
| Sessions/security | `SESSION_SECRET`, `TRUSTED_ORIGINS` | Required for production session/origin policy; rotate through incident procedure. |
| Scheduled work | `SHWAI_INTELLIGENCE_CRON_SECRET`, `SHWAI_JOB_RUNNER_SECRET` | Required before enabling scheduled endpoints/workers; use platform-native auth where available. |
| Email | `EMAIL_PROVIDER_URL`, `EMAIL_PROVIDER_API_KEY`, `EMAIL_FROM` | Required for verification, invitation, recovery, and delivery queues. Without them the server records `CONFIGURATION_REQUIRED` and does not claim delivery. |
| Storage | `STORAGE_PROVIDER`, `STORAGE_ENDPOINT`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY` | Required for private object storage, signed URLs, upload scanning, expiry, and export artifacts. |
| AI | `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY`, `AI_PRIMARY_PROVIDER`, `AI_FALLBACK_PROVIDER` | Server-only; V3–V6 safeguards remain active when providers are unavailable. |
| Billing | `PAYMENT_PROVIDER`, `PAYMENT_API_KEY`, `PAYMENT_WEBHOOK_SECRET` | Required for provider-hosted checkout and authenticated idempotent webhook processing. No card data belongs in SHWAI. |
| Identity/connectors | Google/Microsoft/OAuth/Classroom/Graph variables | Configuration-required until school authorization, mapping, sync policy, and end-to-end tests exist. |
| Distributed controls | `REDIS_URL` | Preferred for production distributed rate limits and job coordination; PostgreSQL fallback limitations must be accepted explicitly. |
| Observability | `SENTRY_DSN`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `LOG_LEVEL` | Required for production error/latency/trace monitoring; payload minimization remains mandatory. |

## Secret handling rules

Never log values, include them in audit details, pass them as client props, or return them from a server function. Use secret references in provider configuration rows, not raw credentials. Rotate credentials after suspected exposure, disable the affected connector, revoke active sessions where relevant, and record the incident.

## Safe environments

Development may use local non-production credentials and synthetic data. Staging must use separate credentials, a realistic schema, a synthetic/de-identified school, provider sandboxes, and test email sinks. Production uses only production secrets and real school data under an approved data-processing and retention policy.
