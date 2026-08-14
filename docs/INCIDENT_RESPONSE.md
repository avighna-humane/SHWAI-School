# SHWAI incident response

## Severity and ownership

The on-call/platform owner coordinates containment, the security owner preserves evidence, and the school/customer operations owner handles affected-school communication. Legal/privacy counsel determines notification obligations. This runbook is operational guidance, not legal advice.

| Severity | Example | Immediate objective |
| --- | --- | --- |
| Critical | Confirmed cross-school exposure, session-secret compromise, payment-secret leak | Stop access, rotate/revoke, preserve evidence, activate incident leadership |
| High | Account takeover, repeated privilege escalation, unsafe export/import, provider credential exposure | Contain actor and connector, revoke affected sessions, investigate scope |
| Medium | Repeated rate-limit abuse, failed job storm, provider outage | Throttle/disable feature, preserve queued work, restore safely |
| Low | Individual delivery failure or isolated validation issue | Retry or remediate with audit record |

## Response steps

1. **Detect.** Capture request/correlation ID, timestamp, deployment version, school scope if privacy-safe, actor/session metadata, and the alert source. Do not copy passwords, tokens, raw provider bodies, or unnecessary student data into tickets.
2. **Contain.** Revoke sessions, disable compromised users/memberships, block suspicious IPs or rate-limit subjects, disable the affected AI/connector/provider, pause import/export/deletion/job workers, and rotate credentials through the secret manager.
3. **Preserve.** Retain `hw_security_events`, `hw_audit_events`, job/import/export records, provider event IDs, and deployment logs. Restrict evidence access and record every support access.
4. **Assess.** Determine affected schools, users, records, provider payloads, time window, and whether data was viewed, changed, exported, or delivered. Use school-scoped queries and minimum necessary access.
5. **Eradicate and recover.** Patch or revert the application, invalidate stale sessions/tokens, forward-fix or restore the database as appropriate, re-run migrations and readiness checks, then re-enable providers/jobs gradually.
6. **Communicate.** Tell affected school administrators what is known, what was contained, what data may be involved, and what actions are required. Legal/privacy owners determine formal notices.
7. **Learn.** Write a post-incident review with root cause, detection gap, timeline, affected controls, tests added, and owner/date for corrective actions.

## Specific playbooks

- **Session/auth compromise:** rotate session secret if exposed, delete active sessions for affected users or the whole tenant, require password reset, review login/security events, and verify email/MFA policy.
- **Tenant escape/IDOR:** disable the endpoint or role, preserve query/audit evidence, identify all school IDs touched, patch server-derived scope, and run cross-school regression tests before re-enabling.
- **Import/export abuse:** pause the job, revoke artifact access, expire/delete staged files, inspect error/audit logs, and confirm no public storage URL was issued.
- **AI/provider leak:** disable the feature/provider, preserve request IDs and minimized payload metadata, rotate keys, inspect provenance/usage events, and notify the school if sensitive data left the approved boundary.
- **Provider outage:** keep in-app records available, mark delivery failed/configuration-required, enqueue bounded retry, and never report external success.
- **Backup/deployment failure:** stop rollout, preserve the last known-good artifact, restore/test in isolation, and communicate the declared recovery point and data gap.
