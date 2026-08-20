# SHWAI backup and recovery

## Current classification

**PARTIAL IMPLEMENTATION — EXTERNAL INFRASTRUCTURE REQUIRED.** The repository now provides a repeatable PostgreSQL custom-format backup command, retention cleanup, an isolated restore-test command, readiness configuration checks, and a recovery sequence. It still cannot prove managed automated backups, PITR/WAL retention, provider backup monitoring, or a completed production restore drill from this sandbox.

## Implemented commands

Create a custom-format dump with a restricted local output directory:

```bash
npm run db:backup
```

Production requires `BACKUP_OUTPUT_DIR`, `BACKUP_PROVIDER`, `BACKUP_BUCKET`, and `BACKUP_RETENTION_DAYS`; the command refuses to run without an explicit production output location and provider name. The generated manifest records format, size, retention, and restore command but never records a connection string or secret. The command does not replace managed encrypted backups or PITR.

Restore into an isolated database only:

```bash
RESTORE_DATABASE_URL='postgresql://isolated-restore-db' \
RESTORE_DUMP_PATH='/secure/path/shwai-YYYY-MM-DD.dump' \
npm run db:restore:test
```

The restore command requires `pg_restore`, refuses to target the primary production URL when `NODE_ENV=production`, runs with `--exit-on-error`, and checks for core, session, and private-storage tables. The command is a technical verification aid; a successful run is not a substitute for provider-managed backup retention, PITR, or a documented school-data restoration drill.

## Required production policy

| Item            | Required baseline                                                                                  | Evidence to retain                                              |
| --------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Database backup | Managed PostgreSQL automated backup and PITR where supported                                       | Provider configuration, backup success alerts, retention policy |
| Frequency       | At least daily full backup plus provider PITR/WAL policy appropriate to school data                | Schedule and sample backup IDs                                  |
| Retention       | Legal/contractual retention by data category; no automatic deletion without approved policy        | Signed retention configuration and audit record                 |
| RPO             | Define maximum acceptable data loss for core school operations                                     | Approved service objective                                      |
| RTO             | Define maximum acceptable restoration time for core school operations                              | Approved service objective and drill result                     |
| Restore test    | Restore into an isolated environment, run migrations/health checks, validate school-scoped records | Dated drill log, checksums/row counts, incident follow-up       |
| Storage         | Versioning, private bucket, lifecycle/expiry, encryption, malware policy, and provider recovery    | Storage policy and restore test                                 |
| Monitoring      | Alert on backup failure, age beyond policy, restore failure, and storage capacity                  | Alert delivery evidence and incident owner                      |

## Recovery sequence

1. Detect and classify the incident; freeze destructive jobs and revoke compromised credentials if applicable.
2. Preserve security/audit evidence and record the incident correlation ID.
3. Select the last known-good database/storage snapshot consistent with the declared RPO.
4. Restore into an isolated environment first; run `/health`, `/readiness`, migration compatibility checks, and tenant-scoped sample queries.
5. Compare record counts and critical school data checksums; do not expose restored student data until access review passes.
6. Promote the restored environment or forward-fix the primary, then rotate credentials and invalidate sessions as appropriate.
7. Communicate impact, recovery point, missing data, and next actions to affected school administrators.
8. Record a post-incident review and update the runbook.

AI, email, SMS, payment, storage, scanner, and GPS outages should degrade to persisted in-app records and configuration-required/failed provider state. A deployment failure should use the prior immutable application artifact, while an irreversible database migration requires restore/forward-fix rather than an unsafe binary rollback.
