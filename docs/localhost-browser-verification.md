# Localhost browser verification

Date: 2026-08-20

| Route | Result | Finding |
| --- | --- | --- |
| `/` | PASS | Existing SHWAI landing page renders with platform preview, role-selection section, pricing link, and no SSR error. |
| `/login` | PASS | Login form, recovery link, register link, server-derived identity language, and explicit PostgreSQL configuration message render. |
| `/health` | PASS | Health JSON responds from the existing local server. |
| `/readiness` | PASS for graceful failure | Readiness reports database-not-ready without exposing stack traces or credentials when no database URL is configured. |

Authenticated role flows are blocked in this sandbox because no PostgreSQL server or seeded database is available. They must be run after configuring a development PostgreSQL URL, applying `npm run db:migrate`, and running `npm run db:seed:dev`.

Additional checks:

| Route | Result | Finding |
| --- | --- | --- |
| `/register` | PASS | Registration form, consent checkbox, password guidance, sign-in link, and explicit PostgreSQL configuration message render. |
| `/app` without a session | PASS for protected boundary | The page shows `Checking authenticated school membership…` while the unauthenticated session query resolves; no protected dashboard data is rendered. A live no-session redirect confirmation remains part of the database-backed browser test. |
