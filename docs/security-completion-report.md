# SHWAI complete security hardening completion report

**Repository:** `avighna-humane/SHWAI-School`  
**Branch:** `main`  
**Date:** 2026-08-14  
**Author:** Manus AI

## Executive summary

This security pass materially improved the server-side security posture of SHWAI across authentication, session handling, request boundaries, authorization, tenant isolation, file metadata, AI policy, persistent throttling, structured security events, error handling, and deployment documentation. The work does **not** claim that SHWAI is 100% secure. The completion matrix below separates repository-enforced controls from deployment-dependent controls and unimplemented capabilities.

The most important changes are server-side: client-controlled identity echoes were removed from hardened chat, homework, notices, and submission flows; school and relationship checks were strengthened; login and registration received persistent abuse throttles and structured events; V6 prediction evidence is now derived from persisted school records rather than client-supplied counts or feature snapshots; AI throttling now has user, school, and hashed-IP dimensions; request origin, body size, headers, and error paths are protected centrally; and sensitive deployment limitations are documented rather than overstated.

## A. Vulnerabilities discovered

The audit found normal-session password verification without explicit parameter bounds or constant-time byte comparison; production cookie security dependent only on observed request protocol; no persistent login/registration throttling; no explicit trusted-origin boundary beyond framework CSRF support; missing global security headers and request-size enforcement; raw server/provider error paths that could expose internal details; pass-through validators carrying client school, role, user, teacher, author, sender, reader, and student fields; unsafe base64 attachment persistence with weak metadata validation; document storage keys without traversal checks; same-school recipient validation missing in chat; V6 prediction requests trusting client observation counts, feature snapshots, and target identifiers; V6 knowledge chunks without content-integrity metadata; and scheduled intelligence responses exposing per-school failure details.

The audit also confirmed boundaries that cannot be honestly claimed from this repository alone: MFA/passkeys, PostgreSQL RLS policy verification, private object storage and malware scanning, password reset, CAPTCHA, provider billing caps, SIEM integration, WAF/DDoS protection, managed backups, restore testing, and endpoint/MDM controls.

## B. Vulnerabilities fixed

| Area | Fix implemented | Evidence |
| --- | --- | --- |
| Authentication | Bounded PBKDF2 parameters, malformed-hash rejection, constant-time-style byte comparison, generic failed-login response, persistent login/registration throttles, security events, and login session rotation. | `src/lib/auth.ts`, `src/actions/auth.ts`, `src/lib/security.ts` |
| Session security | Production Secure cookie behavior, HTTP-only/SameSite/path/expiry attributes, hashed session tokens, logout deletion, and pre-login old-session clearing. | `src/lib/auth.ts`, `src/actions/auth.ts` |
| CSRF/origin | Existing server-function CSRF middleware retained and explicit trusted-origin rejection added for server functions/state-changing requests. | `src/start.ts` |
| Headers and resource limits | CSP, HSTS on HTTPS, frame denial, nosniff, Referrer-Policy, Permissions-Policy, request correlation, and 12 MB Content-Length limit. | `src/start.ts` |
| Error leakage | Server/provider error messages are allowlisted or generic; client telemetry receives redacted bounded messages without stacks or response URLs. | `src/lib/security.ts`, `src/server.ts`, `src/start.ts`, `src/lib/lovable-error-reporting.ts` |
| Mass assignment | Strict schemas remove authority-bearing client fields from hardened chat, homework, notices, and submission calls. | `src/actions/chat.ts`, `src/actions/homework.ts`, `src/actions/notices.ts`, route callers |
| Chat BOLA | Recipient must be an active user with an active membership in the authenticated school; sender metadata is server-derived; per-user send throttle added. | `src/actions/chat.ts` |
| Homework/files | Server derives student identity and school; attachment MIME allow-list, filename checks, exact base64-size checks, five-megabyte decoded limit, and submission throttling added. | `src/actions/homework.ts`, `src/lib/security.ts` |
| Documents | Storage-key traversal protection, MIME allow-list, required MIME for stored files, and audience-scoped ordinary staff listings. | `src/actions/v1.ts`, `src/lib/security.ts` |
| Notices | Server-derived author/role/reader identity and bounded attachment payloads. | `src/actions/notices.ts` |
| V6 predictions | Target entity must exist in the authenticated school; observation counts, missing-data warnings, and feature snapshots derive from persisted records; client evidence fields are ignored for authority. | `src/actions/v6.ts`, `src/components/v6/prediction-workspace.tsx` |
| V6 knowledge | Active-source checks, embedding-reference validation, content hash, ingester identity, and ingestion timestamp. | `scripts/migrate.ts`, `src/actions/v6.ts` |
| AI abuse | Normalized prompt-injection patterns, user/school/IP persistent limits, existing per-user/per-school quotas, input/output bounds, timeout behavior, and sanitized provider errors. | `src/lib/ai/policy.ts`, `src/lib/ai/provider.ts` |
| Scheduled endpoint | Constant-time shared-secret comparison, persistent IP throttle, security event, and generic per-school failure response. | `src/routes/api.intelligence.run.ts` |
| Database transport | Production PostgreSQL connections require TLS. | `src/lib/db.ts` |

## C. Files changed

The implementation changed `scripts/migrate.ts`; authentication, chat, homework, notices, V1 document actions, V6 actions, AI policy, auth/database/security libraries, request/server/error handling, the scheduled intelligence endpoint, affected route callers, and the V6 prediction workspace. New documentation and tests are `SECURITY.md`, `docs/security-audit-notes.md`, `docs/security-browser-verification.md`, `docs/security-completion-report.md`, `src/lib/security.ts`, and `src/lib/security.test.ts`.

## D. Database and migration changes

The migration now creates `hw_security_rate_limits` for server-controlled window counters and `hw_security_events` for structured security events. V6 knowledge chunks gain `content_hash`, `ingested_by`, and `ingested_at` fields. Supporting indexes cover rate-limit expiry, security-event school/time lookup, event type/time lookup, and existing V6 retrieval indexes.

The migration was not executed against a live database during this session because no `DATABASE_URL` or `SUPABASE_DATABASE_URL` was configured. The application correctly reports persistent workflows as unavailable without database configuration; production operators must run `npm run db:migrate` in a controlled environment and verify the resulting schema.

## E. Authentication changes

The application continues to use server-side sessions and does not store session tokens in browser storage. Password hashes retain the existing PBKDF2-SHA-256 design with unique salts. Verification now rejects malformed or implausibly expensive stored parameters and compares derived bytes without ordinary string equality. Login and registration are persistently throttled by hashed IP/email dimensions, failed login timing is equalized with a dummy hash path, and successful login clears an existing cookie-backed session before issuing a new session.

MFA, passkeys, password reset, recovery, device management, and privileged-account factor enforcement are **CONFIGURATION_REQUIRED** or **NOT_IMPLEMENTED**; no fake OTP flow was added.

## F. Authorization changes

The hardened server actions no longer authorize from request-body role, school, user, membership, sender, author, reader, teacher, or student fields. These values are derived from `AuthContext`, and resource relationship queries verify the active school membership or assignment before reading or mutating data. Chat recipients, homework enrollment, teacher class assignment, document audiences, V6 prediction targets, and V6 knowledge sources are now checked server-side.

A full automated endpoint-by-endpoint authorization harness for every legacy V1–V6 action is not yet implemented. This is why the matrix marks broad authorization and IDOR coverage **PARTIAL**, even though the targeted fixes are enforced.

## G. Tenant isolation and RLS

The hardened paths require authenticated school predicates in addition to resource identifiers. V6 retrieval and prediction evidence is school-scoped, and documents, chat, homework, notices, and submissions use authenticated school boundaries. No PostgreSQL/Supabase RLS policy set was verified from this repository, so RLS is marked **NOT_IMPLEMENTED** rather than implied by application predicates. Production deployment should add and attacker-test RLS using the actual database connection model.

## H. Application security changes

The request middleware now rejects untrusted state-changing origins unless the origin is same-origin or listed in `SHWAI_TRUSTED_ORIGINS`. It enforces a 12 MB request-body Content-Length ceiling and returns security headers on normal, rejected, and server-error responses. Production database connections require TLS. Client telemetry and server error pathways redact URLs, connection strings, paths, tokens, cookies, API keys, provider response bodies, and stack traces from user-facing or external reporting paths.

The repository contains no raw HTML rendering in the audited security paths. Existing future rich-text or markdown features still require a maintained sanitizer before accepting untrusted HTML.

## I. AI security changes

AI remains server-only and configuration-aware. The policy normalizes Unicode/control characters, blocks unsafe content and common prompt-injection attempts, constrains input/output sizes, enforces role access, and adds persistent user, school, and hashed-IP throttles. V6 knowledge answers continue to use approved, school-scoped sources and citations. V6 prediction requests cannot fabricate observation counts or evidence snapshots through client input, and insufficient data remains an explicit unavailable state. V6 provenance and human-review controls remain in place for high-impact AI outputs.

Provider billing caps, actual cost accounting, concurrency queues, semantic prompt-injection defense, output toxicity classification, vector-store hardening, and external AI monitoring remain **PARTIAL** or **CONFIGURATION_REQUIRED**.

## J. Data and privacy changes

The pass minimizes authority-bearing client data, hashes IP/email identifiers before storing them in rate-limit/security context, redacts sensitive keys from security detail, and avoids storing raw credentials or cookies in events. Document access is audience-scoped for ordinary staff, while sensitive V6 governance and prediction operations remain role-limited.

A centralized data-classification, retention, correction, deletion, and export policy engine is not implemented. Existing homework base64 persistence remains a legacy design that should move to private object storage before production.

## K. Rate limiting and abuse prevention

Server-controlled persistent rate-limit rows now cover registration, login, chat sends, homework submissions, AI user/school/IP request windows, and scheduled intelligence. Limits are enforced through atomic PostgreSQL upserts, not editable client records. AI also retains existing usage aggregation limits. This materially reduces brute force, chat spam, attachment spam, AI prompt spam, and scheduled-endpoint abuse.

CAPTCHA/Turnstile, WAF, DDoS protection, centralized anomaly alerting, and provider billing enforcement remain deployment controls. The application does not report fake blocked-attack counts or security scores.

## L. Budget and cost protection

Application-level AI request quotas, input limits, output-token bounds, model allow-list support, timeouts, and feature-specific usage records are present. Provider-side spending caps, monthly budgets, estimated monetary cost, storage metering, and external budget alerts were not verified and are therefore **CONFIGURATION_REQUIRED** or **PARTIAL**.

## M. Detection and monitoring

`hw_security_events` records authentication outcomes, registration, logout, AI rate-limit blocks, scheduled-intelligence activity, and other security-relevant events with outcome, severity, actor/school context where available, resource, correlation ID, redacted detail, and timestamp. The event stream is designed for export but is not a SIEM. Centralized logging, alert routing, retention, and anomaly dashboards are **CONFIGURATION_REQUIRED**.

## N. Incident-response foundation

`SECURITY.md` contains an eight-step incident sequence: detection, triage, containment, investigation, eradication, recovery, notification, and post-incident review. It also defines handling of correlation IDs and sensitive data, recommended containment actions, and deployment responsibilities. Named organizational contacts, on-call assignments, legal decision-makers, exercises, and restore drills must be supplied by the operator.

## O. Tests executed

| Command | Result |
| --- | --- |
| `npm run check` | PASS |
| `npm test -- --run` | PASS — 9 files, 40 tests |
| Focused ESLint over all changed TypeScript files | PASS |
| `npm audit --omit=dev --audit-level=high` | PASS — 0 reported vulnerabilities at verification time |
| `npm run build` | PASS — production build completed |
| `git diff --check` | PASS |
| Repository-wide `npm run lint` | NOT PASS — existing repository-wide baseline reported 747 problems (740 errors, 7 warnings); focused lint for all changed files passes |

The new security tests cover constant-time comparison behavior, traversal-safe storage keys, attachment MIME/name/size validation, security-detail redaction, provider-error sanitization, prompt-injection blocks, and layered AI rate-limit contracts. Existing V1–V6 tests continue to pass.

## P. Manual browser and HTTP testing

The local public landing page loaded successfully. The unauthenticated `/app` route rendered the expected authentication boundary rather than granting workspace access. HTTP responses included CSP, Permissions-Policy, Referrer-Policy, X-Content-Type-Options, X-Frame-Options, and unique X-Request-ID headers. HSTS was correctly absent from the local HTTP request and is emitted for HTTPS requests.

Live authenticated login/logout, role matrix, cross-school IDOR attempts, document downloads, AI retrieval, audit access, security-setting mutation, rate-limit exhaustion against PostgreSQL, and migration execution could not be performed because the sandbox had no database configuration or authenticated fixture. These are explicitly recorded in `docs/security-browser-verification.md` and remain deployment verification requirements.

## Q. Security completion matrix

The detailed required matrix is maintained in [`SECURITY.md`](../SECURITY.md). The principal classifications are summarized below.

| Area | Status | Evidence | Remaining risk |
| --- | --- | --- | --- |
| Authentication, password security, sessions | COMPLETE | Server sessions, bounded PBKDF2 verification, throttles, cookie protections, logout invalidation, login rotation. | MFA, reset, recovery, and device management absent. |
| Authorization and IDOR/BOLA | PARTIAL | Targeted server-derived identity and relationship checks across hardened actions. | Full V1–V6 attacker harness and legacy endpoint inventory remain. |
| Tenant isolation | PARTIAL | School predicates and school-scoped AI/document/relationship queries. | RLS not verified; legacy resources need further tests. |
| RLS | NOT_IMPLEMENTED | No production policy set included or verified. | Add and test RLS at deployment. |
| CSRF, CORS, headers, request bounds | COMPLETE | Framework CSRF, trusted-origin guard, no wildcard CORS, CSP/HSTS-on-HTTPS, body limit, correlation IDs. | Verify every hosting proxy and final CSP. |
| File security | PARTIAL | Attachment validation and safe storage-key checks. | Private object storage, malware scanning, download/delete boundaries absent. |
| AI security and high-stakes safety | PARTIAL / COMPLETE for review boundary | Server provider, prompt blocks, quotas, approved-source retrieval, provenance, target validation, explicit insufficient data, human review. | Provider cost caps, semantic injection defense, output classifier, and full legacy caller inventory absent. |
| Rate limiting and abuse prevention | COMPLETE / PARTIAL | Persistent user/school/IP throttles and generic errors. | CAPTCHA, WAF, DDoS, SIEM alerting, and shared production load validation required. |
| Detection and logging | PARTIAL | Structured server-owned security events with redaction and correlation IDs. | SIEM/alerting/retention integration absent. |
| Incident response | PARTIAL | Repository runbook and containment guidance. | Organization-specific contacts, exercises, and legal processes absent. |
| Backups and recovery | CONFIGURATION_REQUIRED | Requirements documented; no restore test performed. | Operator must configure encrypted backups and restore drills. |
| Dependency security | COMPLETE at verification time | Production `npm audit` reported zero high-severity vulnerabilities. | Continuous CI scanning required. |
| Security testing | PARTIAL | 9 files/40 tests plus focused lint and public HTTP smoke tests. | Live DB/RLS/storage/authenticated attacker tests remain. |

Allowed statuses are **COMPLETE**, **PARTIAL**, **CONFIGURATION_REQUIRED**, **BLOCKED**, and **NOT_IMPLEMENTED**. No area is marked complete solely because a UI component exists.

## R. Remaining risks and known limitations

The most significant residual risks are the absence of verified production RLS, MFA, password reset, private object-storage downloads, malware scanning, centralized data classification/retention, full legacy endpoint authorization tests, live database/API attack testing, provider billing caps, semantic retrieval/prompt-injection defenses, and infrastructure protections. The full repository lint baseline also remains unresolved outside the focused changed-file lint scope.

The new persistent security tables require the migration to run before login throttling, security-event writes, AI layered limits, chat throttles, homework throttles, and scheduled endpoint throttles can operate against a deployed database. Operators should deploy schema and application changes together, confirm TLS, configure trusted origins and secret management, and run the authenticated verification checklist before exposing the application to real school data.

## S. Production configuration required

At minimum, production requires HTTPS, `DATABASE_URL` or `SUPABASE_DATABASE_URL`, `SHWAI_TRUSTED_ORIGINS`, a secret-managed `SHWAI_INTELLIGENCE_CRON_SECRET`, server-only AI provider configuration, private database networking, backup/restore policy, private object storage with scanning, MFA or a verified identity provider for privileged users, centralized security-event monitoring, WAF/DDoS controls, and operator-defined incident contacts. `SECURITY.md` provides the full deployment table.

## T. GitHub delivery

**Implementation commit:** `25a95f2f1e7f8eaae4590861aa82b95a843a9449`.  
**Push status:** The security implementation is pushed to `origin/main`; this report records the implementation commit and is followed by a documentation-only synchronization commit.  
**Working tree:** Clean after the final synchronization commit.

