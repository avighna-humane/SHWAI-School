# SHWAI backup and recovery

## Current classification

**BLOCKED — EXTERNAL INFRASTRUCTURE REQUIRED.** The repository defines PostgreSQL migrations and destructive-operation boundaries, but it cannot prove automated backups, point-in-time recovery, backup monitoring, or restore testing from the sandbox.

## Required production policy

| Item | Required baseline | Evidence to retain |
| --- | --- | --- |
| Database backup | Managed PostgreSQL automated backup and PITR where supported | Provider configuration, backup success alerts, retention policy |
| Frequency | At least daily full backup plus provider PITR/WAL policy appropriate to school data | Schedule and sample backup IDs |
| Retention | Legal/contractual retention by data category; no automatic deletion without approved policy | Signed retention configuration and audit record |
| RPO | Define the maximum acceptable data loss for core school operations | Approved service objective |
| RTO | Define the maximum acceptable restoration time for core school operations | Approved service objective and drill result |
| Restore test | Restore into an isolated environment, run migrations/health checks, validate school-scoped records | Dated drill log, checksums/row counts, incident follow-up |
| Storage | Versioning, private bucket, lifecycle/expiry, encryption, and provider recovery | Storage policy and restore test |

## Recovery sequence

1. Detect and classify the incident; freeze destructive jobs and revoke compromised credentials if applicable.
2. Preserve security/audit evidence and record the incident correlation ID.
3. Select the last known-good database/storage snapshot consistent with the declared RPO.
4. Restore into an isolated environment first; run `/health`, `/readiness`, migration compatibility checks, and tenant-scoped sample queries.
5. Compare record counts and critical school data checksums; do not expose restored student data until access review passes.
6. Promote the restored environment or forward-fix the primary, then rotate credentials and invalidate sessions as appropriate.
7. Communicate impact, recovery point, missing data, and next actions to affected school administrators.
8. Record a post-incident review and update the runbook.

AI/email/SMS/payment/GPS outages should degrade to persisted in-app records and configuration-required/failed provider state. A deployment failure should use the prior immutable application artifact, while an irreversible database migration requires restore/forward-fix rather than an unsafe binary rollback.
