# SHWAI production architecture

## Scope and classification

SHWAI is a TanStack Start React/TypeScript application with PostgreSQL persistence, server functions, and server-only provider boundaries. The repository now contains code-complete foundations for onboarding, school membership switching, controlled invitations, email verification, password recovery, staged student import, bounded export, privacy requests, health probes, persistent jobs, permissions, and provider configuration. It is **not yet a production-ready deployment** because live infrastructure and end-to-end verification are unavailable.

## Trust boundaries

The browser is an untrusted client. It may request actions, but it does not select the authoritative school, role, user identity, plan, or relationship scope. Server functions resolve `AuthContext` from an HTTP-only session and active membership, validate Zod inputs, apply permissions, scope SQL by `context.schoolId`, and write audit/security events for sensitive operations.

The application server is the only boundary allowed to access PostgreSQL, email, AI, storage, payment, OAuth, and job-runner credentials. Provider adapters return explicit `CONFIGURATION_REQUIRED`, `FAILED`, or `VERIFIED` states; the UI must not render fabricated delivery, payment, GPS, storage, or AI success.

| Boundary | Implemented control | Remaining deployment requirement |
| --- | --- | --- |
| Browser → server | HTTP-only session, origin checks, request IDs, body limit, security headers, Zod validation, server-derived identity | HTTPS termination, WAF/DDoS, browser CSP review |
| Server → PostgreSQL | Parameterized tagged SQL, school-scoped predicates, foreign keys/indexes, transactions for registration/import/reset | Managed TLS, RLS defense-in-depth, backups/PITR, restore testing, migration gate |
| Server → providers | Server-only environment variables, provider state, bounded timeouts, generic error messages | Real email/storage/payment/OAuth/AI credentials and provider test accounts |
| Long-running work | `hw_jobs` schema, idempotency key, claim/complete helper | Persistent worker, retry policy, queue monitoring, dead-letter handling |
| School data | `school_id` on operational records, membership-scoped session, permission matrix, audit events | Independent tenant/RLS review and production access review |

## Tenant context

A session stores a user, school, and membership. A user may have multiple active memberships; `listMemberships` returns only active memberships joined to active schools, and `switchSchool` verifies ownership of the target membership before rotating the session. No client-provided school ID is accepted as proof of access.

The onboarding workspace persists school profile, timezone, country, currency, curriculum, grading system, language, plan/subscription state, and a step/status state machine. It counts persisted academic and people records before allowing the academic setup step to advance.

## Core request lifecycle

1. Request middleware establishes a correlation ID, trusted-origin decision, hashed request metadata, bounded body policy, and response security headers.
2. A server function validates input and obtains the session-backed `AuthContext`.
3. A permission or role guard executes before the SQL operation.
4. SQL is parameterized, tenant-scoped, bounded, and transactional where multiple records change.
5. Sensitive mutations append audit/security events without passwords, tokens, provider bodies, or raw student data.
6. The client receives a safe response and refreshes the relevant server query; it never becomes the source of authority.

## Operational state

The import flow uses `UPLOAD → STAGE → VALIDATE → REVIEW → COMMIT`. The export foundation creates an audited, rate-limited, bounded export job and returns a short-lived inline artifact. Larger exports require the job worker and private object storage deployment boundary. Identity flows use one-time hashed tokens for verification, reset, and invitation acceptance; token values are never persisted in plaintext.

## AI and external services

The existing V3–V6 AI provider abstraction remains server-only and retains provenance, usage governance, approved-source boundaries, and insufficient-data safeguards. Email, storage, payment, SMS, WhatsApp, OAuth, education connectors, and error tracking are abstractions/configuration boundaries unless a provider adapter and end-to-end test are present.

## Non-claims

This architecture does not claim regulatory compliance, MFA implementation, RLS completeness, billing readiness, object-storage readiness, backup readiness, SSO readiness, or production readiness. Those classifications require the deployment evidence listed in `docs/PRODUCTION_READINESS_REPORT.md`.
