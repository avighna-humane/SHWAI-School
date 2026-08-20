# SHWAI Production Readiness Report

**Repository:** `avighna-humane/SHWAI-School`
**Branch:** `main`
**Audit date:** 2026-08-20
**Author:** Manus AI

## 1. Executive status

# NOT YET SELLABLE

SHWAI has a materially stronger production foundation, but the evidence does not support a `SELLABLE` or `PRODUCTION READY` claim. The repository contains authenticated, school-scoped server workflows, real TOTP MFA, a server-side billing webhook boundary, and explicit provider boundaries. A real-school launch remains blocked until deployment infrastructure, PostgreSQL migration and restore evidence, provider credentials, live authenticated browser verification, and remaining production integrations are completed.

> The application now fails closed where infrastructure is missing. It does not treat a visible route, configured plan label, attempted provider request, local demo seed, or environment variable as evidence of production readiness.

## 2. What was actually implemented

This pass applied focused production-engineering changes rather than redesigning the application. The global notification menu reads persisted, school- and recipient-scoped notifications through existing server actions. Read and mark-all-read operations use the authenticated server identity instead of local mock notification state.

The application exposes both `/ready` and the backward-compatible `/readiness` endpoint through one shared fail-closed handler. A new `npm run readiness:check` command reports machine-readable `READY`, `WARNING`, `CONFIGURATION_REQUIRED`, and `BLOCKED` states for database, migrations, authentication, environment, trusted origins, email, storage, AI, billing, background jobs, monitoring, backups, and security headers.

Node-backed migration and seed commands load `.env` automatically when present. A development-only fictional seed remains available through `npm run db:seed:dev`; it never runs in non-development mode and never contains real school data.

Authentication now includes a database-backed failed-login counter and temporary account lockout after repeated invalid attempts, TOTP enrollment with AES-GCM encrypted secrets and one-time recovery codes, generic MFA challenges at login, a two-hour idle timeout with an eight-hour absolute session expiry, password rotation with session revocation, per-session listing/revocation, and logout-all-session revocation. Email verification resend rotates old tokens, is rate limited, and returns enumeration-safe messaging.

Billing now has durable customer, subscription, invoice, and webhook-event tables; HMAC-SHA256 signature verification; duplicate-event idempotency; provider-customer/subscription mapping; subscription/payment-failure/cancellation transitions; a seven-day past-due grace period; owner-only billing overview; and server-side plan-plus-status entitlement checks for AI generation and data portability. Checkout, provider customer creation, and provider sandbox evidence are still absent.

The repository also includes deployment setup, billing, AI governance, administrator, teacher, parent, and student runbooks created from actual repository behavior. Existing import, export, privacy, invitation, onboarding, jobs, audit, provider-boundary, and V1–V6 documentation remains authoritative for those areas.

## 3. Authentication

| Capability                 | Status                                              | Evidence and limitation                                                                                                                                                                                                |
| -------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Registration               | Complete in code                                    | Creates school, owner user, membership, consent, and verification token transactionally. Email delivery is provider-dependent.                                                                                         |
| Login                      | Complete in code / database required                | Uses PBKDF2-SHA-256, active membership, verified-email policy, server-derived school/role/plan, throttling, lockout, and generic failure responses.                                                                    |
| MFA/TOTP                   | Complete in code / deployment verification required | Encrypted TOTP secret, RFC 6238 verification with small clock skew, one-time recovery codes, enrollment/disablement/regeneration, and login challenge are implemented. `MFA_ENCRYPTION_KEY` is required in production. |
| Privileged MFA policy      | Complete in code                                    | The owner cannot require privileged TOTP until every owner, principal, and administrator in the school is enrolled.                                                                                                    |
| Logout                     | Complete in code                                    | Deletes the current session and records audit/security events.                                                                                                                                                         |
| Logout all sessions        | Complete in code                                    | Deletes every session for the authenticated user and records audit/security events.                                                                                                                                    |
| Session expiration         | Complete in code                                    | HTTP-only sessions have an eight-hour absolute expiry and a two-hour server-side idle timeout.                                                                                                                         |
| Session rotation           | Complete in code                                    | Login, password change, invitation acceptance, logout-all, and current-session creation rotate or revoke sessions. Active sessions can be listed and individually revoked.                                             |
| Password reset             | Complete in code / email required                   | One-time hashed reset tokens revoke sessions after reset. Delivery requires an email provider.                                                                                                                         |
| Account lock/rate limiting | Complete in code                                    | IP/email throttles and persistent failed-login lockout are implemented; distributed deployment behavior needs staging verification.                                                                                    |

## 4. School onboarding

School registration, server-backed onboarding settings, academic prerequisites, memberships, invitations, role assignment, consent records, and linked student/teacher/parent/staff entities exist in code. A real PostgreSQL migration and authenticated browser run are required before declaring onboarding operational for a customer. Campus hierarchy, extensive checklist automation, guardian approval, and complete school activation lifecycle remain partial.

## 5. Real data import/export

Student CSV/JSON staging includes alias normalization, bounded input, validation, duplicate detection, preview/error rows, school authorization, and atomic commit. Bounded school-scoped CSV/JSON exports are audited, rate-limited, and now gated by server-derived plan and subscription status. XLSX parsing, teacher/parent/staff adapters, private export artifacts, large asynchronous exports, reusable mapping UI, and restore-tested import operations remain partial or configuration-required. XLSX is intentionally not enabled through a dependency that introduced high and critical audit findings during evaluation.

## 6. Roles and permissions

The current server permission matrix covers student, teacher, parent, staff, admin, principal, and owner roles, with server-derived school membership and plan context. Tenant filters, owner-only billing/MFA policy controls, and entitlement checks are present on the newer production-sensitive actions. Vice principal, subject teacher, class teacher, counselor, accountant, librarian, transport staff, support staff, and separate platform-owner role granularity are not implemented as distinct persisted roles. Legacy V1–V6 actions still require a complete permission-by-permission and cross-tenant staging audit.

## 7. Security

Implemented protections include HTTP-only sessions, production-secure cookies, PBKDF2 password hashing, one-time hashed verification/reset/invitation tokens, TOTP MFA with encrypted secrets and one-time recovery codes, two-hour idle timeout plus eight-hour absolute session expiry, password rotation, per-session revocation, trusted-origin checks, CSRF protection, security headers, constant-time comparisons, redacted error handling, request IDs, server-side tenant and role checks, rate limiting, safe attachment validation, security events, audit records, and failed-login lockout.

RLS defense-in-depth, WAF/DDoS controls, private storage malware scanning, SIEM/error-monitoring delivery, secret rotation evidence, dependency exception review, live attacker testing, backup/restore testing, and legal/privacy review remain deployment or implementation requirements.

## 8. Integrations

| Integration                           | Status                                   | Exact interpretation                                                                                                                       |
| ------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| PostgreSQL                            | Configuration-required                   | Migration and persistence code exists; no database is available in this sandbox.                                                           |
| Email                                 | Configuration-required                   | Server adapter exists for verification, recovery, invitations, and resend; delivery is unverified.                                         |
| AI provider                           | Configuration-required                   | Server-only provider abstraction exists; credentials and provider tests are absent here.                                                   |
| Private object storage                | Not implemented / configuration-required | Metadata and validation boundaries exist; private bucket, signed URLs, scanning, and expiry are not complete.                              |
| SMS/WhatsApp/push                     | Not implemented                          | No verified production delivery adapter is present.                                                                                        |
| Google/Microsoft/education connectors | Not implemented                          | OAuth, token storage, sync, conflict handling, and revocation are not present.                                                             |
| Monitoring                            | Configuration-required                   | Redacted error/security hooks exist; a real destination must be configured and tested.                                                     |
| Payment provider                      | Partial server boundary                  | Signed webhook processing and server-side reconciliation records exist; provider checkout, customer creation, and sandbox evidence do not. |

## 9. Billing

Billing is **PARTIAL SERVER BOUNDARY — NOT READY FOR LIVE SALES**. The application persists provider customer/subscription/invoice/webhook-event records, verifies signed HMAC webhook payloads, makes webhook retries idempotent, reconciles supported subscription and invoice events, records audit/security events, and applies server-derived plan/status entitlements to AI generation and data portability. It does not create provider customers, start provider-hosted checkout, provide a billing portal, reconcile provider state on a schedule, or carry provider sandbox evidence. See [`BILLING.md`](BILLING.md).

## 10. AI

AI is **PARTIAL / PROVIDER REQUIRED**. Server-only generation, safety policy, bounded requests, retries, request IDs, usage metadata, provenance, approval state, approved-source retrieval, human-review boundaries, and server-side professional-plan entitlement checks exist. Live provider credentials, per-school budget enforcement, embeddings, OCR, speech, independent red-team evidence, provider data-use review, and monitoring remain required. See [`AI_GOVERNANCE.md`](AI_GOVERNANCE.md).

## 11. Database

The PostgreSQL migration is deterministic and repeatable in code, with tables, indexes, foreign keys, check constraints, and transaction-backed workflows. The current migration includes durable TOTP MFA and billing tables, and the readiness checker verifies their presence along with the core schema. No live migration, rollback drill, RLS review, backup, point-in-time recovery, restore test, concurrency test, or large-school query audit was possible in this sandbox.

## 12. Storage

Attachment metadata and strict filename/type/size/base64 validation exist. Private object storage, signed upload/download URLs, malware scanning, retention, deletion, access logging, and restore evidence are not complete. The application must not claim that private document delivery is active without configured storage and end-to-end verification.

## 13. Background jobs

A persistent job ledger with idempotency, bounded payloads, claims, completion, and failure state exists. Authenticated job and intelligence endpoints exist. A durable worker, retry/dead-letter operations, cancellation, monitoring, and deployment scheduling remain required.

## 14. Monitoring

Health, readiness, request IDs, redacted errors, security events, and provider status boundaries exist. The readiness checker reports monitoring as configuration-required unless `SENTRY_DSN` or `OTEL_EXPORTER_OTLP_ENDPOINT` is present. Metrics, traces, alert routing, SLOs, log retention, and incident escalation require deployment configuration.

## 15. Testing

The final verification run for this implementation produced the results below:

| Check             | Status                    | Limitation                                                                                                                                 |
| ----------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| TypeScript        | PASS                      | `npm run check` exited 0.                                                                                                                  |
| Vitest            | PASS: 12 files / 50 tests | `npm test -- --run` exited 0, including billing-signature, TOTP, and entitlement coverage.                                                 |
| Focused lint      | PASS                      | Changed production files passed ESLint with `--max-warnings=0`.                                                                            |
| Full lint         | BASELINE FAILURE          | `npm run lint` reports 715 findings across unrelated legacy formatting; no new changed-file lint findings were present.                    |
| Build             | PASS                      | `npm run build` exited 0; existing non-fatal Vite externalization/chunk warnings remain.                                                   |
| Diff check        | PASS                      | `git diff --check` exited 0.                                                                                                               |
| Security tests    | PARTIAL                   | Existing policy/unit coverage exists; live attacker testing is not complete.                                                               |
| E2E tests         | BLOCKED                   | Authenticated workflows require migrated PostgreSQL and seeded sessions.                                                                   |
| Dependency audit  | PASS                      | `npm audit --omit=dev --audit-level=high` reported 0 vulnerabilities after the ExcelJS experiment was rolled back.                         |
| Readiness checker | EXPECTED BLOCKED          | `npm run readiness:check` emitted non-sensitive JSON and exited 1 because the sandbox has no PostgreSQL/provider deployment configuration. |

## 16. Browser verification

Public browser verification previously passed for `/`, `/login`, `/register`, `/health`, `/readiness`, and the unauthenticated `/app` boundary. The `/ready` route returned the expected non-sensitive database-not-ready JSON, and `/login` rendered after the prior hardening pass. The new MFA settings, billing owner page, authenticated notification/session workflows, and webhook success path require PostgreSQL-backed browser verification.

School onboarding, admin/teacher/student/parent login, state transitions, import/export, documents, billing, and unauthorized-access attempts remain blocked by the absence of PostgreSQL and provider infrastructure in this sandbox.

## 17. Production environment requirements

A real deployment requires Node.js 22, PostgreSQL with TLS and managed backups/PITR, `PUBLIC_APP_URL`, `SHWAI_TRUSTED_ORIGINS`, `MFA_ENCRYPTION_KEY`, secret storage and rotation, a durable job worker, an email provider and verified sending domain, private object storage and scanning, an AI provider if AI is enabled, a concrete payment provider only if billing is enabled, HTTPS/DNS, monitoring and alert delivery, scheduled job infrastructure, incident ownership, backup/restore evidence, and school-specific privacy/data-processing approval. Exact variable names are documented in `.env.example`, [`PRODUCTION_SETUP.md`](PRODUCTION_SETUP.md), and [`ENVIRONMENT_VARIABLES.md`](ENVIRONMENT_VARIABLES.md).

## 18. Remaining blockers

The main blockers are the absence of a live deployment database and staging environment; no authenticated browser evidence; incomplete private storage; missing XLSX and teacher/parent/staff import adapters; missing SMS/WhatsApp/push and education connectors; billing checkout/customer creation/reconciliation and provider sandbox evidence; no durable worker verification; no backup/PITR restore evidence; no WAF/SIEM/error-monitoring delivery evidence; incomplete role granularity; partial legacy mock-backed workspaces; and lack of legal/contractual approval for real student data. These are intentionally reported as blockers rather than hidden behind demo screens or fictional credentials.

## 19. Git

| Field                 | Value                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------ |
| Repository            | `avighna-humane/SHWAI-School`                                                                    |
| Branch                | `main`                                                                                           |
| Current work          | Commercial-launch hardening implementation verified locally                                      |
| Implementation commit | `2fcc2f1`                                                                                        |
| Push status           | Implementation commit `2fcc2f1` and report-evidence commit `1d1bd02` are pushed to `origin/main` |
| Working tree          | Clean after remote verification                                                                  |

## References

1. [SHWAI production setup runbook](PRODUCTION_SETUP.md)
2. [SHWAI billing status](BILLING.md)
3. [SHWAI AI governance](AI_GOVERNANCE.md)
4. [SHWAI security policy](SECURITY.md)
5. [SHWAI deployment runbook](DEPLOYMENT.md)
6. [SHWAI backup and recovery guidance](BACKUP_AND_RECOVERY.md)
7. [SHWAI import documentation](DATA_IMPORT.md)
8. [SHWAI export documentation](DATA_EXPORT.md)
