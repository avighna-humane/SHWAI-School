# SHWAI Production Readiness Report

**Repository:** `avighna-humane/SHWAI-School`
**Branch:** `main`
**Audit date:** 2026-08-20
**Author:** Manus AI

## 1. Executive status

# NOT YET SELLABLE

SHWAI has a materially stronger production foundation, but the evidence does not support a `SELLABLE` or `PRODUCTION READY` claim. The repository contains authenticated, school-scoped server workflows and explicit provider boundaries. A real-school launch remains blocked until deployment infrastructure, PostgreSQL migration and restore evidence, provider credentials, live authenticated browser verification, and remaining production integrations are completed.

> The application now fails closed where infrastructure is missing. It does not treat a visible route, configured plan label, attempted provider request, or local demo seed as evidence of production readiness.

## 2. What was actually implemented

This pass applied focused production-engineering changes rather than redesigning the application. The global notification menu now reads persisted, school- and recipient-scoped notifications through existing server actions. Read and mark-all-read operations use the authenticated server identity instead of local mock notification state.

The application now exposes both `/ready` and the backward-compatible `/readiness` endpoint through one shared fail-closed handler. A new `npm run readiness:check` command reports machine-readable `READY`, `WARNING`, `CONFIGURATION_REQUIRED`, and `BLOCKED` states for database, migrations, authentication, environment, trusted origins, email, storage, AI, billing, background jobs, monitoring, backups, and security headers.

Node-backed migration and seed commands load `.env` automatically when present. A development-only fictional seed remains available through `npm run db:seed:dev`; it never runs in non-development mode and never contains real school data.

Authentication now includes a database-backed failed-login counter and temporary account lockout after repeated invalid attempts, while preserving generic invalid-credential responses. A server-enforced `logoutAllSessions` action revokes every session for the current user, records an audit event and security event, and is available from the existing account menu. CI focused lint now covers the added readiness and session-related files.

The repository also includes the deployment setup, billing, AI governance, administrator, teacher, parent, and student runbooks created from actual repository behavior. Existing import, export, privacy, invitation, onboarding, jobs, audit, provider-boundary, and V1–V6 documentation remains authoritative for those areas.

## 3. Authentication

| Capability                 | Status                               | Evidence and limitation                                                                                                                                    |
| -------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Registration               | COMPLETE IN CODE                     | Creates a school, owner user, membership, consent, and verification token in a transaction. Email delivery is provider-dependent.                          |
| Login                      | COMPLETE IN CODE / DATABASE REQUIRED | Uses PBKDF2-SHA-256, active membership, verified email policy, server-derived school/role/plan, throttling, and generic failure responses.                 |
| Logout                     | COMPLETE IN CODE                     | Deletes the current session and records audit/security events.                                                                                             |
| Logout all sessions        | COMPLETE IN CODE                     | Deletes every session for the authenticated user and records audit/security events.                                                                        |
| Session expiration         | COMPLETE IN CODE                     | HTTP-only sessions have an eight-hour expiration and server-side expiry checks.                                                                            |
| Session rotation           | PARTIAL                              | Login, school switching, invitation acceptance, and logout-all flows create or revoke sessions; device listing and per-device management are not complete. |
| Password reset             | COMPLETE IN CODE / EMAIL REQUIRED    | One-time hashed reset tokens revoke sessions after reset. Delivery requires an email provider.                                                             |
| MFA/TOTP/WebAuthn          | NOT IMPLEMENTED                      | Privileged MFA policy can block sign-in, but enrollment and verification are absent.                                                                       |
| Account lock/rate limiting | COMPLETE IN CODE                     | IP/email throttles and persistent failed-login lockout are implemented; distributed deployment behavior needs staging verification.                        |

## 4. School onboarding

School registration, server-backed onboarding settings, academic prerequisites, memberships, invitations, role assignment, consent records, and linked student/teacher/parent/staff entities exist in code. A real PostgreSQL migration and authenticated browser run are required before declaring onboarding operational for a customer. Campus hierarchy, extensive checklist automation, guardian approval, and complete school activation lifecycle remain partial.

## 5. Real data import/export

Student CSV/JSON staging includes alias normalization, bounded input, validation, duplicate detection, preview/error rows, school authorization, and atomic commit. Bounded school-scoped CSV/JSON exports are audited and rate-limited. XLSX, teacher/parent/staff adapters, private export artifacts, large asynchronous exports, reusable mapping UI, and restore-tested import operations remain partial or configuration-required.

## 6. Roles and permissions

The current server permission matrix covers student, teacher, parent, staff, admin, principal, and owner roles, with server-derived school membership and plan context. Tenant filters and permission checks are present on the newer production-sensitive actions. Vice principal, subject teacher, class teacher, counselor, accountant, librarian, transport staff, support staff, and separate platform-owner role granularity are not implemented as distinct persisted roles. Legacy V1–V6 actions still require a complete permission-by-permission and cross-tenant staging audit.

## 7. Security

Implemented protections include HTTP-only sessions, production-secure cookies, PBKDF2 password hashing, one-time hashed verification/reset/invitation tokens, request body limits, trusted-origin checks, CSRF protection for server functions, CSP/HSTS/referrer/frame/permissions headers, constant-time comparisons, redacted error handling, request IDs, server-side tenant and role checks, rate limiting, safe attachment validation, security events, audit records, and failed-login lockout.

RLS defense-in-depth, TOTP/WebAuthn, WAF/DDoS controls, private storage malware scanning, SIEM/error-monitoring delivery, secret rotation evidence, dependency exception review, live attacker testing, and legal/privacy review remain deployment or implementation requirements.

## 8. Integrations

| Integration                           | Status                                   | Exact interpretation                                                                                          |
| ------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| PostgreSQL                            | CONFIGURATION-REQUIRED                   | Migration and persistence code exists; no database is available in this sandbox.                              |
| Email                                 | CONFIGURATION-REQUIRED                   | Server adapter exists for verification, recovery, and invitations; delivery is unverified.                    |
| AI provider                           | CONFIGURATION-REQUIRED                   | Server-only OpenAI-compatible abstraction exists; credentials and provider tests are absent here.             |
| Private object storage                | NOT IMPLEMENTED / CONFIGURATION-REQUIRED | Metadata and validation boundaries exist; private bucket, signed URLs, scanning, and expiry are not complete. |
| SMS/WhatsApp/push                     | NOT IMPLEMENTED                          | No verified production delivery adapter is present.                                                           |
| Google/Microsoft/education connectors | NOT IMPLEMENTED                          | OAuth, token storage, sync, conflict handling, and revocation are not present.                                |
| Monitoring                            | CONFIGURATION-REQUIRED                   | Redacted error/security hooks exist; a real destination must be configured and tested.                        |
| Payment provider                      | NOT IMPLEMENTED FOR LIVE BILLING         | Plan identifiers and server-side minimum feature checks exist; checkout and verified webhooks do not.         |

## 9. Billing

Billing is **not implemented for live payment processing**. The plan catalog and server-side plan context must not be interpreted as a completed subscription system. Provider customer records, checkout, signed webhooks, reconciliation, invoices, payment failures, grace periods, cancellation, and entitlement transitions remain required. See [`docs/BILLING.md`](BILLING.md).

## 10. AI

AI is **PARTIAL / PROVIDER REQUIRED**. Server-only generation, safety policy, bounded requests, retries, request IDs, usage metadata, provenance, approval state, approved-source retrieval, and human-review boundaries exist. Live provider credentials, per-school budget enforcement, embeddings, OCR, speech, independent red-team evidence, provider data-use review, and monitoring remain required. See [`docs/AI_GOVERNANCE.md`](AI_GOVERNANCE.md).

## 11. Database

The PostgreSQL migration is deterministic and repeatable in code, with tables, indexes, foreign keys, check constraints, and transaction-backed workflows. The new readiness checker verifies database reachability and the core schema table. No live migration, rollback drill, RLS review, backup, point-in-time recovery, restore test, concurrency test, or large-school query audit was possible in this sandbox.

## 12. Storage

Attachment metadata and strict filename/type/size/base64 validation exist. Private object storage, signed upload/download URLs, malware scanning, retention, deletion, access logging, and restore evidence are not complete. The application must not claim that private document delivery is active without configured storage and end-to-end verification.

## 13. Background jobs

A persistent job ledger with idempotency, bounded payloads, claims, completion, and failure state exists. Authenticated job and intelligence endpoints exist. A durable worker, retry/dead-letter operations, cancellation, monitoring, and deployment scheduling remain required.

## 14. Monitoring

Health, readiness, request IDs, redacted errors, security events, and provider status boundaries exist. The readiness checker reports monitoring as configuration-required unless `SENTRY_DSN` or `OTEL_EXPORTER_OTLP_ENDPOINT` is present. Metrics, traces, alert routing, SLOs, log retention, and incident escalation require deployment configuration.

## 15. Testing

The final verification run for this pass produced the following evidence:

| Check             | Status                    | Limitation                                                                                                                                                                           |
| ----------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TypeScript        | PASS                      | `npm run check` passed.                                                                                                                                                              |
| Vitest            | PASS: 10 files / 44 tests | `npm test -- --run` passed.                                                                                                                                                          |
| Focused lint      | PASS                      | All changed production files passed ESLint with `--max-warnings=0`.                                                                                                                  |
| Full lint         | BASELINE FAILURE          | `npm run lint` reports 785 existing Prettier findings across the repository; the focused changed-file lint is clean, and no broad auto-format was applied to unrelated legacy files. |
| Build             | PASS                      | `npm run build` passed; existing non-fatal Vite externalization/chunk warnings remain.                                                                                               |
| Diff check        | PASS                      | `git diff --check` passed after formatting.                                                                                                                                          |
| Security tests    | PARTIAL                   | Existing policy/unit coverage exists; live attacker testing is not complete.                                                                                                         |
| E2E tests         | BLOCKED                   | Authenticated workflows require migrated PostgreSQL and seeded sessions.                                                                                                             |
| Dependency audit  | PASS                      | `npm audit --omit=dev --audit-level=high` reported 0 vulnerabilities.                                                                                                                |
| Readiness checker | EXPECTED BLOCKED          | `npm run readiness:check` emitted non-sensitive JSON and exited 1 because the sandbox has no PostgreSQL/provider deployment configuration.                                           |

## 16. Browser verification

Public browser verification passed for `/`, `/login`, `/register`, `/health`, `/readiness`, and the unauthenticated `/app` boundary. The new `/ready` route returned the expected non-sensitive database-not-ready JSON, and `/login` still rendered after the hardening changes. Authenticated notification/session workflows require PostgreSQL-backed browser verification.
School onboarding, admin/teacher/student/parent login, state transitions, import/export, documents, billing, and unauthorized-access attempts remain blocked by the absence of PostgreSQL and provider infrastructure in this sandbox.

## 17. Production environment requirements

A real deployment requires Node.js 22, PostgreSQL with TLS and managed backups/PITR, `PUBLIC_APP_URL`, `SHWAI_TRUSTED_ORIGINS`, secret storage and rotation, a durable job worker, an email provider and verified sending domain, private object storage and scanning, an AI provider if AI is enabled, a payment provider only if billing is enabled, HTTPS/DNS, monitoring and alert delivery, scheduled job infrastructure, incident ownership, backup/restore evidence, and school-specific privacy/data-processing approval. Exact variable names are documented in `.env.example`, [`docs/PRODUCTION_SETUP.md`](PRODUCTION_SETUP.md), and [`docs/ENVIRONMENT_VARIABLES.md`](ENVIRONMENT_VARIABLES.md).

## 18. Remaining blockers

The main blockers are the absence of a live deployment database and staging environment; no authenticated browser evidence; missing MFA enrollment; incomplete storage implementation; missing SMS/WhatsApp/push and education connectors; live billing not implemented; no durable worker verification; no backup/PITR restore evidence; no WAF/SIEM/error-monitoring delivery evidence; incomplete role granularity; partial legacy mock-backed workspaces; and lack of legal/contractual approval for real student data. These are intentionally reported as blockers rather than hidden behind demo screens or fictional credentials.

## 19. Git

| Field                 | Value                                                                        |
| --------------------- | ---------------------------------------------------------------------------- |
| Repository            | `avighna-humane/SHWAI-School`                                                |
| Branch                | `main`                                                                       |
| Current work          | Production-readiness implementation and verification completed for this pass |
| Implementation commit | `f46ac154cfc568f4633ca12b891a49af4deacac0`                                   |
| Push status           | Implementation commit pushed to `origin/main`                                |
| Working tree          | Clean after push verification                                                |

## References

1. [SHWAI production setup runbook](PRODUCTION_SETUP.md)
2. [SHWAI billing status](BILLING.md)
3. [SHWAI AI governance](AI_GOVERNANCE.md)
4. [SHWAI security policy](SECURITY.md)
5. [SHWAI deployment runbook](DEPLOYMENT.md)
6. [SHWAI backup and recovery guidance](BACKUP_AND_RECOVERY.md)
7. [SHWAI import documentation](DATA_IMPORT.md)
8. [SHWAI export documentation](DATA_EXPORT.md)
