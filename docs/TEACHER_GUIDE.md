# SHWAI teacher guide

Teachers sign in through an active school membership. The server resolves the school and role before permitting data access; the browser cannot select a school or elevate a teacher to leadership.

## Supported workflows

The teacher workspace supports assigned-class attendance, homework and submission workflows, grading surfaces, notices, notifications, evidence-backed intelligence review where permitted, interventions assigned to the teacher, and teacher-assistance routes. Persisted actions must pass server-side authorization, school scoping, validation, and audit logging.

## AI assistance

Teacher AI outputs are reviewable drafts. A teacher must edit or explicitly approve generated content before publication. Provider credentials remain server-only, and absent or failed providers return configuration-required or failure states rather than fabricated content.

## Student data responsibilities

Teachers should access only assigned classes and students needed for their duties. Sensitive context is consent-aware, visibility-controlled, expiring, and human-created. Intelligence alerts are evidence-backed signals, not automatic disciplinary decisions. Record interventions and outcomes through the authorized workflow so follow-up and audit history remain available.

## Current limitations

Real school use still requires configured PostgreSQL, email if verification/invitations are used, AI credentials for AI routes, and staging verification of teacher permissions. Offline, SMS/WhatsApp/push, external classroom synchronization, and large asynchronous exports remain deployment or provider-dependent.
