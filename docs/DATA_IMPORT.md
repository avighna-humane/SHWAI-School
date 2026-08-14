# SHWAI data import

## Implemented workflow

The production foundation supports **student CSV and JSON imports** through a staged workflow: upload, parse, normalize headers, validate, preview, review, and atomically commit. Each job is school-scoped, initiated by an authorized leadership user, rate-limited, persisted in `hw_import_jobs` and `hw_import_rows`, and audited.

## Validation

The server validates file extension/declared format, size, row count, required student name and admission number, date format, duplicate admission numbers within the upload, and enrollment relationship completeness. When class, section, and academic-year IDs are provided, the commit transaction verifies that all three records belong to the same school and that the section belongs to the class. Invalid rows are stored with row/field messages and are not silently written.

| Format/entity | Status | Boundary |
| --- | --- | --- |
| CSV students | IMPLEMENTED | Bounded parser, header aliases, staging, validation, review, atomic commit. |
| JSON students | IMPLEMENTED | Array-of-object input, same normalization and validation. |
| XLSX students | CONFIGURATION REQUIRED | Requires a server-side workbook parser, private object storage, MIME/content inspection, and malware scanning. |
| Teachers/parents | NOT IMPLEMENTED | The adapter boundary exists conceptually; production provisioning should use controlled invitations and entity-specific mappings before enabling imports. |
| Attendance/grades/homework | NOT IMPLEMENTED | Must use entity-specific foreign-key validation and staged transactions rather than generic field copying. |

## Security requirements

The current foundation stores bounded staged JSON in PostgreSQL. For large or sensitive files, configure private object storage with short-lived access, content-type validation, malware scanning, expiry, and download audit. Never expose public bucket URLs or storage credentials. Do not paste real production exports into development or staging.

## Review and rollback

A job with validation errors remains reviewable but cannot be committed by the UI. A commit runs in one PostgreSQL transaction; a failed relationship or duplicate aborts the whole commit rather than partially corrupting a school. The import job and row statuses remain as evidence for support and remediation. A future worker should add rollback/compensating operations for multi-entity imports.
