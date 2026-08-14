# SHWAI security hardening — initial audit notes

**Audit scope:** V1–V6 authentication, sessions, server functions, database access, documents, homework submissions, chat, AI policy/provider, V6 governance, scheduled endpoint, root shell, request middleware, package/dependency posture, and deployment boundaries.

## Confirmed strengths

The application uses server-side authenticated contexts derived from an HTTP-only session cookie and school membership. Passwords are salted PBKDF2-SHA-256 hashes with 210,000 iterations. Most persistence uses parameterized `postgres` tagged-template queries, and the database client has bounded connection pooling and connection timeouts. V3/V6 AI calls are server-side, prompt/input limits and per-user/per-school usage checks exist, approved-source retrieval is school-filtered, and high-stakes AI outputs have human review states. The repository’s production dependency audit reported no high-severity production vulnerabilities at audit time.

TanStack Start’s CSRF middleware is explicitly enabled for server functions in `src/start.ts`, and the root application shell requires authentication before rendering the authenticated workspace. Most modern V1–V6 actions use Zod schemas and include school predicates. Existing tests cover core auth/access, AI policy, V4/V5/V6 policy, and several domain boundaries.

## Concrete gaps requiring hardening

| Area | Evidence | Risk | Planned remediation |
| --- | --- | --- | --- |
| Session verification | `verifyPassword` compares encoded derived keys with normal string equality and accepts arbitrary stored iteration counts | Timing side-channel and malformed-hash cost/DoS risk | Validate PBKDF2 parameters, enforce bounds, and compare decoded bytes in constant-time style |
| Session cookies | `secure` depends only on the current request protocol | Misconfiguration can produce non-Secure cookies behind an HTTPS proxy | Make production cookies Secure by default and document trusted proxy/deployment requirements |
| Login abuse | Registration/login have no persistent rate limit, lockout, or structured security-event path | Brute force and credential-stuffing exposure | Add persistent server-controlled rate-limit state and security events keyed by IP/email/user where available |
| CSRF/origin | Start CSRF middleware exists, but no explicit trusted-origin/CORS policy or security response headers are present | Cross-origin misconfiguration and browser policy gaps | Add request origin guard for state-changing/server-function traffic and security headers with configurable origins |
| Error handling | Server logs raw errors and client reporting sends route/message metadata to a third-party endpoint | Sensitive diagnostics may leave the application boundary | Sanitize client telemetry, redact secrets/connection strings, and keep detailed errors server-side |
| Homework attachments | `submitHomework` accepts pass-through identity fields and raw `fileName`, `fileType`, `fileSize`, `fileData`; only size is checked | Unsafe file metadata/content persistence, storage/DoS risk | Replace validator with strict schema, derive identity, allow-list MIME/extensions, validate base64 bounds, and expose malware-scan/storage boundary |
| Documents | `createDocumentMetadata` accepts arbitrary storage keys/MIME values; no safe download/delete boundary exists | Path traversal, unauthorized object access, unscanned content risk | Validate storage key format, MIME/extension/size, add secure object-storage boundary and explicit configuration status |
| Client-controlled identity echoes | Homework/chat/notices use pass-through validators containing school/user/role/teacher/reader identity fields | Mass-assignment and future regression risk | Remove authority fields from input schemas and derive them only from `AuthContext` |
| Chat recipients | `sendMessage` trusts `receiverId`/`receiverName` without same-school membership/relationship validation | Cross-school messaging and privacy exposure | Validate recipient belongs to active membership in current school and add relationship policy |
| V6 prediction requests | `requestV6Prediction` trusts client `targetEntityId`, `observationCount`, `featureSnapshot`, and data-quality flags | Prediction manipulation, target IDOR, fabricated evidence | Resolve target and evidence server-side; accept only bounded request intent; compute observation counts/warnings from persisted data |
| V6 source ingestion | Approved source chunks accept arbitrary `embeddingReference` and content without provenance/integrity metadata | Retrieval poisoning and unverifiable source lineage | Validate source ownership/state, record content hash/ingester/audit metadata, and keep approval separate from ingestion |
| V6 governance | General audit rows exist, but no dedicated security-event schema for authorization failures, rate limits, cross-tenant attempts, and security changes | Weak detection and incident response | Add structured security events with request correlation, severity, outcome, and redaction |
| Scheduled endpoint | Shared secret endpoint returns per-school error strings and has no rate-limit/replay/IP boundary | Operational endpoint abuse and sensitive result disclosure | Add constant-time secret comparison, bounded execution, generic external response, and deployment boundary documentation |
| RLS/backups/MFA | No repository-verified PostgreSQL RLS, MFA provider, backup/restore test, or SIEM integration | Defense-in-depth and operational risks remain deployment-dependent | Add explicit configuration boundaries, migration-level optional controls where safe, and documentation without false claims |
| Dependencies | `npm audit --omit=dev --audit-level=high` found 0 vulnerabilities at audit time | Requires repeatable CI/deployment scanning | Add security verification script/documentation and preserve lockfile review discipline |

## Deliberate boundaries

No fake MFA, malware scanning, vector retrieval, SIEM, backup, DDoS protection, provider billing cap, or infrastructure firewall will be claimed. Where the repository cannot enforce a control without deployment infrastructure, the hardening documentation will classify it as `CONFIGURATION_REQUIRED` or `BLOCKED` and state the operator action.

## Test priorities

The hardening pass must add backend-focused tests for password/session primitives, trusted-origin decisions, rate-limit behavior, attachment validation, same-school recipient validation, security-event redaction, V6 prediction target/evidence checks, and malformed/oversized input. Existing V1–V6 regression tests must continue to pass.
