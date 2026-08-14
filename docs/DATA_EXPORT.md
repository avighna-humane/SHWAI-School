# SHWAI data export

## Implemented foundation

Authorized owner and principal users can request bounded school-scoped CSV or JSON exports for students, attendance, or grades. The server applies `data.export`, rate-limits by school/user, creates an `hw_export_jobs` record, queries at most 5,000 rows, audits the export, and returns an inline artifact with a 15-minute expiry indication.

## Status matrix

| Capability | Status | Notes |
| --- | --- | --- |
| Permission-protected school scope | IMPLEMENTED | Server derives school and actor; client cannot select another school. |
| CSV/JSON bounded export | IMPLEMENTED | Synchronous foundation limited to 5,000 rows. |
| XLSX export | CONFIGURATION REQUIRED | Requires a server-side workbook writer and private artifact storage. |
| Large background export | DEPLOYMENT REQUIRED | Use `hw_jobs`, a durable worker, private object storage, signed short-lived download URL, retry, and expiry cleanup. |
| Export audit | IMPLEMENTED | `hw_audit_events` records actor, school, type, format, and bounded row count. |
| Deletion/offboarding | PARTIAL | Request and owner-review workflow exists; destructive execution requires legal hold, re-authentication, retention policy, backup, and controlled job implementation. |

No export is considered complete until the artifact is inaccessible after expiry, the download is authorized, and the provider/storage audit is verified in staging.
