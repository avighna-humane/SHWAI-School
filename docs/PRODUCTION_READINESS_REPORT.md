# SHWAI production-readiness report

**Repository:** `avighna-humane/SHWAI-School`  
**Audit date:** 2026-08-14  
**Release scope:** Production-readiness foundations on top of V1–V6  
**Author:** Manus AI

## Executive conclusion

SHWAI is **PRODUCTION-CODE READY — DEPLOYMENT VERIFICATION REQUIRED** for the repository controls implemented in this pass. It is **not yet honest to call the product production-ready** because the environment contains no live PostgreSQL, seeded school tenants, email provider, object storage, payment account, OAuth tenant, durable worker, monitoring destination, backup/PITR evidence, or staging deployment.

The implementation now moves the product from a feature/demo-heavy baseline toward a real multi-tenant school onboarding foundation. School context, role, membership, and plan are server-derived. Leadership can configure onboarding state, invite members, link invitations to persisted student/teacher/parent/staff records, switch among authorized memberships, stage and atomically commit student CSV/JSON imports, generate bounded audited exports, request/review privacy deletion, inspect owner-only system health, revoke sessions, and use deployment health/readiness probes. External services remain explicit configuration boundaries; the application does not fabricate provider success.

## Verification evidence

| Check | Result | Evidence or limitation |
| --- | --- | --- |
| TypeScript | PASS | `npm run check` completed successfully. |
| Regression tests | PASS | Vitest: **10 test files / 44 tests** passed. |
| Focused lint | PASS | All production-readiness-modified TypeScript files passed `--max-warnings=0`. |
| Dependency audit | PASS | `npm audit --omit=dev --audit-level=high` reported **0 vulnerabilities**. |
| Production build | PASS | `npm run build` completed and regenerated the route tree. Existing chunk-size warning remains informational. |
| Whitespace | PASS | `git diff --check` completed successfully. |
| Health browser smoke test | PASS | `GET /health` returned healthy JSON without sensitive diagnostics. |
| Readiness browser smoke test | PASS for safe degraded state | `GET /readiness` returned HTTP-level not-ready/database-not-ready because no database URL exists in the sandbox. |
| Authenticated workflow browser tests | BLOCKED | Requires a live database, seeded memberships, and authenticated sessions. |
| Migration execution | BLOCKED | Requires `DATABASE_URL` or `SUPABASE_DATABASE_URL`; no live database is available. |

## Implemented repository changes

### Tenant context, onboarding, and identity

The authenticated provider now queries active memberships and offers an authorized school switcher. Switching invokes the server action, validates the target membership, rotates the session, and refreshes server-backed context. The local plan preference no longer controls entitlement state; the active school plan and subscription status are selected from the server session context.

`/app/onboarding` persists school name, timezone, country, currency, grading system, curriculum, language, onboarding step, onboarding status, and completion state. Academic readiness counts persisted years, classes, sections, and subjects and blocks the academic step when prerequisites are absent.

Registration requires terms/privacy consent. Verification and password recovery use one-time hashed tokens, session revocation, generic account-existence responses, and explicit email-provider configuration states. A leadership user can create a school-scoped invitation; acceptance provisions or activates the server user, membership, consent record, and linked student/teacher/parent/staff entity in one transaction.

### Authorization and plan enforcement

`src/lib/permissions.ts` provides a server permission matrix for school-wide reads, writes, people management, audit/export, context, simulation/experiment approval, school configuration, import/export/deletion, and security management. The new production-sensitive actions use the matrix rather than client role or school fields. Privileged MFA can be required by school policy, but sign-in is blocked with an explicit configuration-required message until a verified MFA provider is available.

### Import, export, jobs, and reliability

`/app/data-import` supports bounded student CSV/JSON staging, header alias normalization, required-field/date/duplicate/enrollment validation, row error reports, and atomic commit. XLSX, teacher/parent adapters, and large file storage remain explicit boundaries. `/app/data-export` supports owner/principal bounded CSV/JSON exports for students, attendance, and grades, with a five-thousand-row limit, rate limiting, audit records, and short-lived artifact semantics.

`hw_jobs` persistence and `src/lib/jobs.ts` provide idempotency keys, bounded payloads, claim/complete states, attempts, and failure reasons. `/api/jobs/run` authenticates a secret, uses `FOR UPDATE SKIP LOCKED`, processes cleanup jobs, and reports unconfigured processors as failed/configuration-required rather than successful. A durable worker and dead-letter/queue monitoring remain deployment requirements.

### Privacy, operations, observability, and support boundaries

`/app/privacy` adds owner-controlled deletion requests and leadership review with explicit legal-hold and destructive-execution boundaries. `/health` and `/readiness` support deployment probes; the latter returns 503 without leaking database details when readiness fails. `/app/system-health` gives the owner school-scoped job/provider/security-event visibility and session containment actions. `.env.example`, CI, deployment, architecture, integration, backup/recovery, privacy, import, export, and incident-response documentation are included.

## Status matrix

| Capability | Status | Honest interpretation |
| --- | --- | --- |
| PostgreSQL migrations and tenant-scoped persistence | PARTIAL / DEPLOYMENT REQUIRED | Code and indexes exist; live migration, RLS review, backup, restore, and concurrency evidence are missing. |
| Server-derived school/user/role/plan context | IMPLEMENTED IN CODE | Active membership switching and server plan selection are implemented; authenticated multi-school browser testing is blocked. |
| School onboarding/settings | IMPLEMENTED IN CODE | Leadership workflow persists settings and readiness steps; real school seed/migration is required. |
| Controlled invitations | IMPLEMENTED IN CODE | Token, role, school, entity link, consent, audit, and provider boundary exist; email delivery requires configuration. |
| Email verification/password recovery | IMPLEMENTED IN CODE | One-time hashed tokens and session invalidation exist; deliverability and domain verification require an email provider. |
| MFA | CONFIGURATION REQUIRED / BLOCKED | Policy can block privileged sign-in when required; no TOTP/WebAuthn/SSO factor enrollment or verification is implemented. |
| Parent/student provisioning | PARTIAL | Invitation target linking exists; bulk parent/student adapter, guardian approval, unlink workflow, and live identity testing remain. |
| Permission matrix | IMPLEMENTED FOR NEW PRODUCTION ACTIONS | New sensitive surfaces use server permissions; legacy V1–V6 actions still need a complete permission migration review. |
| Student CSV/JSON import | IMPLEMENTED IN CODE | Staging, validation, error report, and atomic commit exist; real schema migration and large-school testing are blocked. |
| XLSX/import storage | CONFIGURATION REQUIRED | Requires parser, private storage, MIME/content validation, malware scan, expiry, and access audit. |
| Data export | IMPLEMENTED BOUNDED FOUNDATION | Owner/principal CSV/JSON export capped at 5,000 rows; large async exports/signed private artifacts are not complete. |
| Privacy/deletion | PARTIAL | Request/review/audit exists; retention execution, legal holds, deletion proof, and restore-tested recovery are not implemented. |
| Background jobs | PARTIAL | Persistent job ledger and cleanup runner exist; durable worker, retry queue, dead-letter state, and monitoring are deployment-required. |
| Email/SMS/WhatsApp/push | CONFIGURATION REQUIRED | Email adapter boundary exists; no verified production delivery adapter/end-to-end evidence. SMS/WhatsApp/push are not implemented. |
| Payments/subscriptions | NOT IMPLEMENTED FOR LIVE BILLING | Plan catalog and display exist; provider-hosted checkout, webhook verification, reconciliation, and idempotency are absent. |
| SSO/OAuth/Google/Microsoft/Classroom/Teams | NOT IMPLEMENTED | Connector architecture/documentation exists; authorization, mapping, sync, revocation, and staging tests are absent. |
| Storage | CONFIGURATION REQUIRED | Safe metadata references exist; private object storage, signed URLs, scanning, expiry, and restore are absent. |
| AI V3–V6 | PARTIAL / PROVIDER REQUIRED | Governance, provenance, safety, and persistence exist; live provider, cost caps, embeddings/OCR/speech, and monitoring require deployment. |
| Observability | PARTIAL | Correlation/security events, redacted errors, health/readiness exist; metrics, traces, alert routing, SLOs, and SIEM delivery are absent. |
| Security | PARTIAL / DEPLOYMENT REQUIRED | Repository hardening is implemented; MFA, RLS, WAF/DDoS, SIEM, backups, restore drills, and live attack tests remain. |
| Accessibility/performance | PARTIAL | Responsive UI and bounded queries exist; WCAG audit, Lighthouse/real-device test, load test, pagination audit, and large-school performance evidence are missing. |
| CI/CD | IMPLEMENTED FOUNDATION | GitHub Actions checks typecheck, tests, audit, build, diff, focused lint, and conditional staging migration. Deployment promotion, secret scanning, image scanning, and required-branch policy need repository configuration. |
| Browser/API verification | PARTIAL | Health/readiness public smoke tests pass safely; authenticated workflows require staging infrastructure. |
| Regulatory compliance | NOT CLAIMED | Requires school/jurisdiction legal, contractual, DPA, retention, consent, and processor review. |

## Required production acceptance gates

Before onboarding a real school, configure and verify managed PostgreSQL TLS, migrations, RLS defense-in-depth, tested backups/PITR, private object storage and scanning, email delivery, a durable worker, secret management/rotation, monitoring/alerts, domain/TLS/WAF, staging seed data, provider sandboxes, error-budget/SLO policy, and a complete authenticated browser matrix across owner, admin, principal, teacher, staff, parent, and student.

The acceptance matrix must include registration/verification/recovery, invitation acceptance, membership switching, onboarding resume, student/parent linking, import validation/commit/duplicate retry, export expiry, deletion request/legal hold, logout/session revocation, permission denial, provider failure, job retry, database failure, mobile layout, keyboard navigation, and cross-school isolation. No external provider should be classified as verified without a recorded staging test and auditable status.

## Changed-file groups

The production pass adds or updates authentication/session context, onboarding and invitation actions/routes, permissions, import/export/privacy/system actions/routes, jobs, health/readiness routes, migration indexes and job tables, navigation, CI, environment template, README, and production runbooks. Earlier V1–V6 and security files remain part of the integrated application and were regression-tested by the verification suite.

## Final claim

The correct release claim is: **SHWAI has a materially stronger production foundation and can proceed to a controlled staging deployment, but it must not be marketed or operated as production-ready until the external deployment gates above are evidenced.**
