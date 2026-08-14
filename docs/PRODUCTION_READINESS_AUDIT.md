# SHWAI production-readiness audit

**Repository:** `avighna-humane/SHWAI-School`  
**Audit date:** 2026-08-14  
**Audit basis:** Repository inspection, migration/action/route review, existing V1–V6 completion reports, security-hardening evidence, and local type/test/build inspection. No production database, object-storage account, email provider, payment account, OAuth tenant, or staging deployment was available in this audit environment.

## Executive classification

SHWAI is **NOT PRODUCTION READY** at the start of this pass. The repository contains meaningful server-side V1–V6 persistence and security foundations, but the application still includes mock/demo state, lacks a complete school onboarding lifecycle, has no controlled invitation/email-verification/password-recovery workflow, has no real multi-school switch UI, and has no verified production integrations, backups, billing, background job worker, staging deployment, or CI/CD pipeline.

The target outcome of this pass is **PRODUCTION-CODE READY — DEPLOYMENT VERIFICATION REQUIRED** for the controls that can be implemented in the repository. It must not be upgraded to **PRODUCTION READY** without live infrastructure, migration, authenticated browser, provider, backup/restore, and operational verification.

## Evidence-backed baseline

| Area | Initial status | Evidence | Production implication |
| --- | --- | --- | --- |
| Core authentication | PARTIAL | `src/actions/auth.ts` creates PostgreSQL users, memberships, sessions, and owner registration; PBKDF2 and security throttles are present. | Email verification, recovery, invitations, MFA, and multi-device controls remain absent. |
| Active school context | PARTIAL | `getAuthContext()` resolves one membership; login accepts an optional authorized `schoolId`. | There is no complete membership list/switch workflow or UI. |
| School onboarding | PARTIAL | Registration creates a school, owner user, and membership. | Operational settings, academic setup, import, invitations, resume/complete state, and verification are absent. |
| Client state | PARTIAL | `app-state.tsx` stores plan, campus, year, locale, offline state, and notification reads in localStorage; school and role are server-resolved. | Plan entitlements and onboarding state must be server-controlled; mock datasets remain in several shells. |
| Identity provisioning | MISSING | `people.ts` creates person records but does not issue controlled invitations or activation links. | Teachers, staff, parents, and students cannot complete a production identity lifecycle. |
| Parent-child linking | PARTIAL | `hw_parent_students` exists and server linking checks school scope. | Approval, invitation/linking codes, verification state, and unlink audit workflow are absent. |
| Data import | MISSING | No staged import job, mapping, validation, preview, commit, rollback, or error report workflow exists. | Real schools cannot safely migrate existing records without developer intervention. |
| Data export/deletion | PARTIAL | `hw_data_requests` and retention tables exist, but no complete server workflow/UI/export worker was found. | Access, export, deletion approval, legal hold, retention execution, and audit must be implemented or explicitly blocked. |
| File storage | PARTIAL | Attachment metadata and safe-key validation exist; V5 stores provider references. | Private object storage, signed downloads, malware scanning, expiry, and deletion are not configured. |
| External connectors | CONFIGURATION REQUIRED | V5 provider configuration records expose payment/GPS/SMS/WhatsApp/payroll/storage/translation states; no live adapters were found. | No payment, email, SMS, WhatsApp, GPS, SSO, calendar, or education-system delivery may be claimed. |
| Notifications | PARTIAL | In-app `hw_notifications` persistence exists. | Email/SMS/WhatsApp/push queues, preferences, retries, provider status, and delivery tracking are absent. |
| Background jobs | MISSING | No generic jobs table/worker was found; intelligence has a secret-authenticated endpoint. | Imports, exports, email, cleanup, and long work cannot safely rely on browser tabs. |
| Scheduler | PARTIAL | `/api/intelligence/run` exists with secret authentication and throttling. | Duplicate execution, job ledger, retries, and broader scheduled maintenance are absent. |
| Billing | MISSING | Subscription route and plan catalog are presentation-only; no provider/webhooks/customer/subscription tables. | SaaS plan state and payments are not production-capable. |
| Feature gating | PARTIAL | Client `planAllows` exists; V1–V6 server entitlement enforcement is not centralized. | Client plan state cannot be trusted for production access control. |
| Security | PARTIAL | `SECURITY.md` and security hardening commit add server sessions, CSRF/origin checks, headers, validation, throttles, audit/security events, and AI controls. | RLS, MFA, storage scanning, SIEM, WAF/DDoS, backups, and live attacker tests remain. |
| Health/readiness | MISSING | No `/health` or `/readiness` route was found. | Deployment cannot reliably distinguish process health from database readiness. |
| Observability | PARTIAL | Correlation IDs and structured security events exist; provider/client error paths are redacted. | Metrics, error tracking provider, latency, job, dependency, and alert pipelines are absent. |
| Privacy | PARTIAL | Data-request/retention tables and security documentation exist. | No complete consent, export, deletion, retention execution, or compliance-readiness workflow. |
| CI/CD | MISSING | No `.github/workflows` files were found; package scripts include check/test/build/lint but not migration validation. | Pull requests and deployment gates are not automated. |
| Database operations | PARTIAL | PostgreSQL migration creates many indexes/foreign keys and security tables; list queries often have limits. | Migration execution, backup/PITR, restore test, full pagination audit, and concurrency testing are not verified. |
| Staging | MISSING | No staging deployment configuration or safe seed workflow was found. | Real school data must not be used in development; environment separation is undocumented. |
| Accessibility/performance | PARTIAL | Responsive React/Tailwind UI and many bounded queries exist. | No systematic WCAG/mobile/performance audit or large-school load verification was run. |
| V1–V6 regression | READY for local code checks | Existing tests, `npm run check`, focused lint, build, and security regression suite pass locally. | Live database/provider/browser regression remains deployment verification. |

## Priority implementation plan

1. Add server-controlled school settings/onboarding state and authorized membership listing/switching.
2. Add invitations, email-verification token lifecycle, password-reset token lifecycle, and provider/job boundaries without fake delivery.
3. Add a permission/entitlement service and move production-sensitive settings away from localStorage-only state.
4. Add staged import/export job records with bounded JSON/CSV support, validation, preview, commit, and explicit XLSX/storage configuration status.
5. Add generic background-job, notification-delivery, health/readiness, and provider-status foundations.
6. Add privacy request workflows, consent/retention documentation, `.env.example`, staging/deployment/architecture/integration/runbooks, and CI gates.
7. Run local regressions and classify all live-infrastructure items as deployment-required rather than claiming them complete.

## Explicit non-claims

The repository does not currently prove working MFA, email/SMS/WhatsApp/push delivery, object-storage downloads, payment processing, Google/Microsoft SSO, Google Classroom/Teams synchronization, Redis-backed distributed rate limits, SIEM/error-tracking integration, automated backups, restore testing, WAF/DDoS protection, or regulatory compliance. Those capabilities require provider credentials, deployment infrastructure, legal review, or additional implementation.
