# SHWAI security policy

The canonical repository security policy, threat model, hardening record, deployment controls, and incident-response runbook are maintained in [`../SECURITY.md`](../SECURITY.md). This document exists at the production-documentation path requested by the architecture brief and should be kept synchronized with the root policy.

The current security classification is **PARTIAL / PRODUCTION-CODE READY — DEPLOYMENT VERIFICATION REQUIRED**. Server sessions, tenant-scoped authorization, trusted-origin/CSRF controls, security headers, request IDs, redacted diagnostics, persistent rate limits, AI safeguards, safe attachment validation, audit/security events, and provider error sanitization are implemented in code. MFA, RLS defense-in-depth, private object-storage scanning, WAF/DDoS, SIEM/error-tracking delivery, backups/restore tests, and live multi-role security testing remain deployment or implementation requirements.
