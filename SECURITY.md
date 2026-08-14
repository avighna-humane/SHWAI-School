# SHWAI Security, Privacy, AI Safety, and Resilience

**Status:** Security hardening implementation baseline; production deployment controls remain environment-dependent.

**Scope:** This document describes the controls enforced by the SHWAI application repository and separates them from controls that require deployment infrastructure, managed identity, object storage, monitoring, or school policy. It is not a claim that the application is completely secure.

## Security model and threat assumptions

SHWAI is a cookie-authenticated, multi-school application. The primary trust boundary is the server-derived tuple **user → active membership → school → role**. Browser inputs, route visibility, client role state, school identifiers, resource identifiers, AI prompts, uploaded content, retrieved documents, and provider responses are treated as untrusted. The database and external infrastructure are separate trust boundaries and must be configured as described below.

The principal threats are credential stuffing, session abuse, cross-school object access, broken role enforcement, mass assignment, unsafe file persistence, chat and notification spam, AI prompt injection and quota exhaustion, retrieval poisoning, provider failure, oversized requests, accidental deletion, and operational compromise. The application uses defense in depth, but infrastructure controls such as firewalls, DDoS protection, managed backups, MFA providers, malware scanning, and SIEM alerting are not created by this repository.

## Implemented controls

### Authentication and sessions

Passwords use salted PBKDF2-SHA-256 with a bounded iteration count. Verification rejects malformed or out-of-range hashes and compares derived bytes using a constant-time-style comparison. Sessions use cryptographically random identifiers stored only as hashes in PostgreSQL, expire after eight hours, are invalidated on logout, and are rotated by clearing an existing cookie-backed session before successful login creates a new one. The session cookie is HTTP-only, SameSite=Lax, path-scoped, and Secure in production or over HTTPS.

Registration and login use persistent, server-controlled throttles keyed by hashed IP context and hashed email context. Failed and successful authentication, logout, registration, and rate-limit events are recorded as structured security events without storing passwords, cookies, raw tokens, or raw email addresses.

MFA, passkeys, password reset, device management, and account recovery are **not implemented** in this repository. Privileged-account MFA is **CONFIGURATION_REQUIRED** through an external identity provider or a future server-side MFA implementation; no fake OTP flow is present.

### Authorization and tenant isolation

Server actions require authentication and role authorization before database work. Hardened homework, notices, chat, document, and V6 prediction paths derive school, user, role, sender, author, reader, and reviewer authority from `AuthContext`. Client-supplied authority echoes are removed from the strict schemas for these paths. Resource queries include authenticated school predicates and relationship checks, including same-school chat recipient membership, student enrollment for homework submission, teacher assignment checks, parent-child relationships, school-scoped documents, and V6 prediction target validation.

Application-level tenant isolation is **PARTIAL** rather than a substitute for database RLS. The migration adds foreign keys and indexes where the existing schema supports them, but a deployment must still evaluate PostgreSQL/Supabase RLS policies against its connection model. RLS policies are not claimed as implemented because no production policy set has been verified from this repository.

### CSRF, origins, headers, and transport

TanStack Start CSRF middleware is enabled for server functions. A request middleware additionally rejects state-changing or server-function requests with an untrusted `Origin`; same-origin requests are accepted, and explicit cross-origin origins are configured through `SHWAI_TRUSTED_ORIGINS`. There is no wildcard authenticated CORS policy.

The request boundary applies a 12 MB `Content-Length` limit, attaches a bounded correlation ID, hashes request IP context before application use, and adds Content-Security-Policy, HSTS on HTTPS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, and frame protections. Production PostgreSQL connections require TLS. The deployment must terminate HTTPS correctly and preserve the intended request protocol through any trusted proxy.

### Input, files, documents, and privacy

Hardened server actions use Zod schemas or equivalent bounded validation for relevant IDs, enumerations, text, arrays, numbers, filenames, MIME types, and base64 payloads. Homework attachments allow only PDF, PNG, JPEG, and plain text MIME types, reject traversal/control-character filenames, require exact base64 size consistency, and enforce a five-megabyte decoded limit. Notice attachments have bounded base64 payloads. Document metadata rejects unsafe storage keys and unsupported MIME types, and ordinary staff document listings are audience-scoped rather than unrestricted.

The repository does not provide a real object-storage download/delete boundary or malware scanning. Secure object storage, generated object names, content scanning, protected downloads, retention, and deletion workflows are **CONFIGURATION_REQUIRED**. Persisting base64 in the existing homework schema remains a legacy limitation and should be replaced by private object storage before production use.

Client error telemetry and server-facing error pages receive sanitized messages. Upstream AI response bodies, database URLs, provider credentials, SQL, filesystem paths, passwords, cookies, and tokens are not intentionally exposed through the sanitized error path. No security score or fake telemetry is generated.

### AI safety and resilience

AI provider calls remain server-side. The AI policy enforces role restrictions, input-size bounds, normalized blocked-pattern detection, prompt-injection patterns, per-user/per-school daily usage limits, persistent user/school/IP minute throttles, provider timeouts, model allow-list support, and explicit configuration-required behavior. AI errors are normalized so upstream provider response bodies do not pass through generic server error paths.

V6 prediction requests validate target entity type and ID against the authenticated school and derive observation counts and data-quality warnings from persisted attendance, grades, submissions, enrollment, homework, assessment, and intervention records. Client-supplied observation counts, feature snapshots, stale flags, and missing-data flags are ignored for authorization and evidence decisions. Insufficient evidence remains an explicit unavailable state. V6 knowledge chunks are restricted to active school sources, validate embedding references, and persist a content hash plus ingester identity and timestamp. Approved-source retrieval remains school-filtered and citation-bound.

AI-generated content and high-impact outputs remain subject to provenance and human review workflows. The application does not automatically punish students, change grades, deny admissions, discipline staff, or create permanent labels. Provider billing caps, concurrency queues, vector-database security, output toxicity classification, and external AI red-team monitoring remain **CONFIGURATION_REQUIRED** or **PARTIAL** depending on deployment.

### Security events and incident response

`hw_security_events` stores structured, server-created events with event type, outcome, severity, optional school and actor context, resource, correlation ID, redacted JSON detail, and timestamp. `hw_security_rate_limits` stores server-controlled window counters and expiry metadata. Normal users do not receive mutation actions for these tables. Existing domain audit events remain separate from structured security events.

The incident response sequence is:

1. **Detection:** Review structured security events, authentication failures, rate-limit blocks, authorization failures, provider alerts, and infrastructure monitoring. If no SIEM is connected, the application’s structured event stream is the available evidence source and centralized monitoring is required.
2. **Triage:** Preserve the correlation ID, timestamp, school, actor context, resource, outcome, and severity. Do not copy passwords, cookies, tokens, raw prompts, or raw student records into incident channels.
3. **Containment:** Revoke affected sessions, disable the affected school or AI feature through authorized governance controls, rotate exposed secrets, restrict the scheduled endpoint, and isolate storage objects. Automated punitive or irreversible actions are not authorized.
4. **Investigation:** Compare security events with domain audit events, database access logs, deployment logs, provider logs, and object-storage logs. Preserve relevant records under the organization’s retention policy.
5. **Eradication:** Patch the vulnerable path, invalidate compromised credentials or sessions, remove poisoned knowledge sources/chunks, and verify tenant predicates and approvals.
6. **Recovery:** Restore service from a verified database/object-storage backup, rerun migrations and tests, validate security settings, and monitor for recurrence.
7. **Notification:** The school owner/security lead determines legal, regulatory, safeguarding, provider, and affected-user notification obligations. The repository does not infer those obligations.
8. **Post-incident review:** Record root cause, detection gap, containment time, affected data, corrective actions, owner, due date, and whether tests were added.

## Production configuration requirements

| Control | Status | Deployment requirement |
| --- | --- | --- |
| HTTPS and proxy correctness | CONFIGURATION_REQUIRED | Terminate HTTPS, preserve the HTTPS protocol, enable HSTS only for domains controlled by the operator, and do not expose credentials over HTTP. |
| Trusted origins | CONFIGURATION_REQUIRED | Set `SHWAI_TRUSTED_ORIGINS` to an explicit comma-separated allow-list; do not use wildcard origins. |
| Database TLS and isolation | CONFIGURATION_REQUIRED | Provide `DATABASE_URL` or `SUPABASE_DATABASE_URL`, enforce private network access where possible, and verify production TLS and least-privilege database credentials. |
| AI provider | CONFIGURATION_REQUIRED | Set the server-only provider URL/key and, preferably, `AI_DEFAULT_MODEL` plus `AI_ALLOWED_MODELS`. Never expose these values to client bundles. |
| Scheduled intelligence | CONFIGURATION_REQUIRED | Set `SHWAI_INTELLIGENCE_CRON_SECRET` in a secret manager and restrict the caller by network or platform policy. |
| MFA/passkeys | CONFIGURATION_REQUIRED | Use a verified external identity provider or implement a server-side factor flow before enabling privileged-account MFA claims. |
| Object storage/downloads | CONFIGURATION_REQUIRED | Use private buckets, generated keys, signed short-lived downloads, authorization checks, deletion controls, and malware scanning. |
| Backups and restore | CONFIGURATION_REQUIRED | Configure encrypted database/object-storage backups, retention, access control, restore testing, and recovery ownership. |
| SIEM/alerting | CONFIGURATION_REQUIRED | Export `hw_security_events` and server logs to centralized monitoring with alerts for repeated login failures, cross-tenant attempts, rate-limit spikes, and privileged changes. |
| CAPTCHA/bot defense | CONFIGURATION_REQUIRED | Add a verified CAPTCHA/Turnstile boundary for public registration if abuse volume warrants it. |
| Firewall/DDoS/endpoint security | CONFIGURATION_REQUIRED | Apply WAF, network segmentation, DDoS protection, OS patching, endpoint protection, and administrative-device controls at deployment level. |

## Security completion matrix

| Area | Status | Evidence | Remaining risk |
| --- | --- | --- | --- |
| Defense in depth | PARTIAL | Authentication, authorization, validation, headers, CSRF, throttles, audit, and security events are layered. | RLS, WAF, DDoS, backups, SIEM, MFA, and malware scanning remain deployment-dependent. |
| CIA triad | PARTIAL | Tenant predicates, bounded writes, rate limits, timeouts, and safe errors improve confidentiality, integrity, and availability. | Infrastructure recovery and object-storage controls are not verified. |
| Authentication | COMPLETE | Server sessions, PBKDF2 hashing, bounded verification, login/registration throttles, and generic credential errors. | MFA and recovery flows are absent. |
| MFA | CONFIGURATION_REQUIRED | No fake MFA is present; external identity boundary is documented. | Privileged accounts need a verified factor before production use. |
| Password security | COMPLETE | Salted PBKDF2, minimum 12-character registration input, bounded parameters, failed-login timing equalization. | Password reset, breached-password screening, and rotation policy are absent. |
| Sessions | COMPLETE | Hashed random session IDs, expiration, logout deletion, production Secure/HTTP-only/SameSite cookie, login rotation. | Session/device management and global revocation controls are limited. |
| Least privilege | PARTIAL | Server roles and resource relationship checks protect hardened paths. | A complete policy registry and periodic access recertification are not implemented. |
| Separation of duties | PARTIAL | AI content/provenance and prediction review states require human review. | Role-escalation and export approval workflows are not centralized. |
| Authorization | PARTIAL | Server-side `AuthContext`, role checks, school predicates, recipient/target checks, and strict schemas. | The full V1–V6 action surface still needs a systematic endpoint-by-endpoint authorization test harness. |
| Tenant isolation | PARTIAL | Hardened paths require authenticated school predicates and relationship checks. | No verified production RLS policy set; legacy actions require continued review. |
| RLS | NOT_IMPLEMENTED | No repository-verified PostgreSQL/Supabase policy set is included. | Add and test RLS using the production connection model. |
| IDOR/BOLA | PARTIAL | Chat, homework, notices, documents, and prediction target boundaries were hardened. | All legacy V2–V5 resources need automated cross-school attack tests. |
| SQL injection | COMPLETE | Reviewed paths use parameterized `postgres` tagged templates; no dynamic SQL construction was introduced. | Continue dependency and code review discipline. |
| XSS | PARTIAL | No raw HTML rendering was found in the audited paths; CSP and output text rendering are present. | Rich-text/markdown and future document previews need a maintained sanitizer and tests. |
| CSRF | COMPLETE | TanStack Start CSRF middleware plus explicit trusted-origin rejection for server-function/state-changing requests. | Verify proxy/header behavior in every production hosting mode. |
| CORS | COMPLETE | No wildcard credentialed CORS policy; explicit trusted origins are used for cross-origin state-changing requests. | No cross-origin API contract is currently supported. |
| HTTPS | CONFIGURATION_REQUIRED | Production cookies and database TLS require secure deployment behavior. | HTTPS termination, certificates, HSTS domain ownership, and proxy policy are external. |
| Security headers | COMPLETE | CSP, HSTS on HTTPS, frame denial, nosniff, referrer, permissions, and request correlation headers. | CSP must be browser-verified in the final hosting environment. |
| Secrets | PARTIAL | Provider/database/cron values are server environment variables and telemetry redacts sensitive keys. | Secret manager, rotation, history scanning, and deployment access controls are external. |
| Encryption | PARTIAL | TLS is required for production database connections and HTTPS is expected. | Application-level field encryption and storage encryption verification are deployment responsibilities. |
| Data classification | PARTIAL | Document and AI governance boundaries distinguish privileged/approved workflows conceptually. | No centralized classification labels and retention engine exist. |
| File security | PARTIAL | Strict homework attachment checks and safe document storage keys are implemented. | Private object storage, download authorization, malware scanning, generated keys, and deletion are not implemented. |
| API security | PARTIAL | Auth, roles, validation, bounded request bodies, rate limits, timeouts, safe errors, and audit exist on hardened paths. | Legacy endpoints need the same systematic review. |
| AI security | PARTIAL | Server-only provider, role policy, input bounds, persistent limits, model allow-list, approved retrieval, provenance, and review. | Provider billing caps, concurrency queue, output classifier, and full caller inventory remain. |
| Prompt injection | PARTIAL | Normalization and common injection patterns are blocked; system/retrieved/user messages are separated in V6 prompts. | Pattern blocking is not a complete semantic defense; uploaded/retrieved content needs broader adversarial testing. |
| AI data leakage | PARTIAL | V6 retrieval and prediction evidence are school-scoped and target-validated. | All legacy AI callers need data-minimization and relationship tests. |
| AI high-stakes safety | COMPLETE | Prediction insufficiency is explicit; provenance/review workflow prevents direct irreversible decisions. | Human operators must honor review states; deployment must restrict governance roles. |
| Rate limiting | COMPLETE | Persistent server-owned windows cover registration, login, chat, homework submission, AI user/school/IP, and scheduled intelligence. | Shared-store behavior and alerting need production load validation. |
| Abuse prevention | PARTIAL | Throttles, generic errors, prompt blocks, and structured events reduce common abuse. | CAPTCHA/bot defense and centralized anomaly response are external. |
| Budget protection | PARTIAL | Per-user/per-school AI request quotas and output limits exist. | Provider billing caps, actual cost accounting, monthly budgets, and alerts are not verified. |
| DDoS protection | CONFIGURATION_REQUIRED | Request/body limits reduce application-layer abuse. | WAF, CDN, network filtering, and volumetric protection are infrastructure-dependent. |
| Network security | CONFIGURATION_REQUIRED | Database TLS and explicit secret boundaries are enforced in application config. | Private networking, firewall, segmentation, and admin-plane restrictions are external. |
| Endpoint security | CONFIGURATION_REQUIRED | Browser secret minimization and secure defaults are documented. | OS patching, MDM, EDR, and compliant admin devices are external. |
| Detection | PARTIAL | Security events record authentication, rate-limit, scheduled, and relevant workflow signals. | Threshold alerts and centralized correlation require monitoring integration. |
| Logging | COMPLETE | Structured security-event schema and redaction helper are implemented; normal users lack mutation routes. | Database/operator access and retention controls require deployment policy. |
| SIEM integration | CONFIGURATION_REQUIRED | Structured events are exportable by database/log pipeline design. | No SIEM connector is present or verified. |
| Incident response | PARTIAL | This runbook defines detection through post-incident review and containment actions. | Named organization roles, legal contacts, on-call rotation, and exercises are external. |
| Backups | CONFIGURATION_REQUIRED | Schema and recovery requirements are documented. | No backup or restore operation was verified in this repository session. |
| Dependency security | COMPLETE | Production `npm audit --omit=dev --audit-level=high` reported zero vulnerabilities during this hardening pass. | Re-run continuously in CI and review transitive changes. |
| Security testing | PARTIAL | New tests cover auth primitives, security helpers, prompt injection, rate-limit contracts, and existing V1–V6 policy tests. | Full resource-level attacker tests, browser/API authenticated tests, RLS tests, and upload/download tests require database/storage fixtures. |

## Reporting a vulnerability

Do not include passwords, cookies, API keys, raw student records, or private AI prompts in an issue. Report suspected vulnerabilities to the organization’s private security contact or repository owner with the affected route/action, a minimal reproduction, timestamp, correlation ID if available, and impact. If a live school deployment is affected, first contain access through the deployment owner and preserve security-event/audit evidence.
