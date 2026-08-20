# Localhost browser verification

Date: 2026-08-20

| Route        | Result                    | Finding                                                                                                                           |
| ------------ | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `/`          | PASS                      | Existing SHWAI landing page renders with platform preview, role-selection section, pricing link, and no SSR error.                |
| `/login`     | PASS                      | Login form, recovery link, register link, server-derived identity language, and explicit PostgreSQL configuration message render. |
| `/health`    | PASS                      | Health JSON responds from the existing local server.                                                                              |
| `/readiness` | PASS for graceful failure | Readiness reports database-not-ready without exposing stack traces or credentials when no database URL is configured.             |

Authenticated role flows are blocked in this sandbox because no PostgreSQL server or seeded database is available. They must be run after configuring a development PostgreSQL URL, applying `npm run db:migrate`, and running `npm run db:seed:dev`.

Additional checks:

| Route                    | Result                      | Finding                                                                                                                                                                                                                                         |
| ------------------------ | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/register`              | PASS                        | Registration form, consent checkbox, password guidance, sign-in link, and explicit PostgreSQL configuration message render.                                                                                                                     |
| `/app` without a session | PASS for protected boundary | The page shows `Checking authenticated school membership…` while the unauthenticated session query resolves; no protected dashboard data is rendered. A live no-session redirect confirmation remains part of the database-backed browser test. |

Production-readiness additions to verify after the next local server refresh:

| Surface                  | Result                      | Finding                                                                                                           |
| ------------------------ | --------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `/ready`                 | Pending browser rerun       | Shares the fail-closed database readiness handler with `/readiness`.                                              |
| Global notification menu | Pending authenticated rerun | Now consumes persisted `hw_notifications` rows and server-scoped read actions instead of mock notification state. |
| Log out all sessions     | Pending authenticated rerun | Uses server-side session deletion, audit logging, and security-event recording.                                   |

Post-hardening browser checks:

| Route    | Result                    | Finding                                                                                                                                  |
| -------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `/ready` | PASS for graceful failure | Returns `{"status":"not_ready","dependencies":{"database":"not_ready"}}` without stack traces or secrets when PostgreSQL is unavailable. |
| `/login` | PASS                      | Login form and server-derived identity messaging still render after the auth/session changes.                                            |
