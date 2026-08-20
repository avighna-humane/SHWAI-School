# SHWAI student guide

Students sign in through an active school membership linked to their student record. The server derives the student identity and school context; client-selected IDs, roles, or permissions are not accepted as proof of access.

## Supported workflows

The student portal is intended to show the student’s own timetable, attendance, homework, submissions, published grades, approved learning resources, notifications, and school notices. A student cannot read another student’s records or school-wide administrative intelligence unless an explicit server permission allows it.

## Tutor safety

The student tutor uses progressive Socratic hints rather than automatically completing work. Requests are subject to safety policy, bounded input/output limits, rate controls, and server-side provider handling. AI output is not a teacher, counselor, medical professional, emergency service, or disciplinary authority.

## Data and progress

Learning events and observed progress are persisted only when the relevant database and feature are configured. Intelligence signals and predictions include evidence and data-quality boundaries and do not permanently label a student or make irreversible decisions.

## Current limitations

The student experience requires a migrated PostgreSQL database and an active linked account. AI features require a configured provider. Offline, speech, OCR, external learning-platform synchronization, and production browser verification remain deployment or provider-dependent.
