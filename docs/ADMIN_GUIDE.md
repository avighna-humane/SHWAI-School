# SHWAI administrator guide

Administrators and school leadership access SHWAI through authenticated memberships. The server derives the school, role, plan, and permissions from the session; changing browser state cannot grant another school or role.

## Core workflows

Leadership can complete school onboarding, configure school identity and academic prerequisites, invite school members, review audit and security events, request and review privacy operations, stage and commit supported student CSV/JSON imports, and request bounded school-scoped CSV/JSON exports. Owners can review system health and revoke school sessions or disable a school user when authorized.

## Invitations and accounts

Create an invitation with a school-scoped role and, for a student invitation, a linked student record. Invitation tokens are random, hashed at rest, expiring, one-time, and auditable. Email delivery is provider-dependent; the application does not claim delivery when the email adapter is unconfigured. Accepted invitations create or activate the user, membership, consent record, and linked entity through a transaction.

## Operational controls

Use `/app/audit`, `/app/system-health`, `/app/data-import`, `/app/data-export`, `/app/privacy`, `/app/onboarding`, and `/app/settings` according to the current permission matrix. Treat the mock-data banner and configuration-required states as explicit boundaries. Before a real school launch, verify PostgreSQL migrations, private storage, email, monitoring, backups, restore procedures, job workers, and provider credentials in staging.

## Current limitations

Live billing, MFA enrollment, XLSX imports, private object-storage delivery, SMS/WhatsApp/push, SSO/education connectors, durable worker deployment, and authenticated browser verification require additional implementation or external configuration. The administrator must not treat a visible route as proof that one of those integrations is active.
