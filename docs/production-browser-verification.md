# Production-readiness browser verification

Date: 2026-08-14

The local SHWAI server was reachable on `http://127.0.0.1:8080`.

| Probe | Result | Evidence |
| --- | --- | --- |
| `GET /health` | PASS | Returned `status=healthy`, `service=shwai-school`, version field, and timestamp without secrets or stack traces. |
| `GET /readiness` | PASS for safe degraded behavior | Returned `status=not_ready`, `dependencies.database=not_ready` because no database URL is configured in the sandbox. No connection string, SQL, or stack trace was exposed. |
| Authenticated onboarding/import/export/privacy/system-health | BLOCKED in sandbox | Requires PostgreSQL, seeded memberships, and an authenticated session. |
| Email/invitation/recovery delivery | CONFIGURATION REQUIRED | No email provider credential is configured; the server must record configuration-required rather than claim delivery. |

This verification proves route wiring and safe dependency failure handling, not production readiness.
