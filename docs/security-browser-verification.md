# SHWAI security browser and HTTP verification

**Date:** 2026-08-14

The local application loaded its public landing page at `http://127.0.0.1:8080/`. The page displayed the public role-selection workflow and did not expose authenticated workspace records as an authenticated session.

The unauthenticated `/app` route returned the application shell with the expected unauthenticated boundary state (`Sign-in required` or the authentication-loading state), rather than granting workspace access. This verifies the browser-visible protected-shell boundary, not an authenticated role matrix.

An HTTP smoke test confirmed the response included `Content-Security-Policy`, `Permissions-Policy`, `Referrer-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and a unique `X-Request-ID`. HSTS was not expected on the local HTTP URL; it is emitted when the request protocol is HTTPS. The response returned status 200 for the public shell and protected shell because the application renders its safe route boundary rather than using a redirect.

Authenticated login, logout, role switching, cross-school resource attempts, document download, AI retrieval, audit-event access, security-setting mutation, and rate-limit exhaustion were not executed against a live database in this sandbox because no database URL or authenticated fixture was available. These remain deployment verification requirements rather than claims of successful manual testing.
