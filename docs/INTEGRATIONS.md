# SHWAI integrations

## Provider policy

SHWAI uses explicit provider boundaries. A configuration row, provider key, or public label is not proof that an external service works. A connector must have authorization, secure credential storage, connection/test status, reconnect/disconnect, error state, audit events, permission control, idempotency, and an end-to-end staging test before it is marked verified.

| Connector | Repository status | Required next evidence |
| --- | --- | --- |
| AI | Server-side provider abstraction and V3–V6 governance implemented. | Live provider credential, moderation/embedding policy where needed, cost cap, failure tests, and data-minimization review. |
| Email | Generic server-only delivery boundary implemented. | Resend/Postmark/SES-compatible adapter, verified domain, queue, retry, bounce handling, and test sink. |
| SMS/WhatsApp | Configuration records only. | Provider adapter, opt-in/preferences, template approval, delivery status, retry, and abuse controls. |
| Storage | Metadata and safe-reference boundary exists. | Private S3/R2/Supabase adapter, signed URL, scanning, expiry, and access audit. |
| Payments | Fee records and provider configuration metadata exist; no live checkout/webhook. | Razorpay/Stripe provider-hosted checkout, signature verification, idempotent webhook ledger, reconciliation, and sandbox tests. |
| Google/Microsoft SSO | NOT IMPLEMENTED. | OIDC/SAML authorization, domain/tenant restriction, identity-to-membership mapping, logout, rotation, and staged tenant test. |
| Classroom/Teams | NOT IMPLEMENTED. | Explicit import/sync policy, external-ID mapping, conflict review, incremental sync, and OAuth scopes. |
| Calendar/Meetings | NOT IMPLEMENTED. | Provider adapter, consent, event ownership, revocation, and failure handling. |
| Monitoring | Correlation/security events and redacted diagnostics exist. | Sentry/OpenTelemetry adapter, metrics, dashboards, alert policy, and privacy review. |

## Webhooks

Any future webhook must verify the provider signature and timestamp, reject replayed event IDs, persist the event before side effects, use idempotent processing, audit the outcome, and return a generic response. Payment or connector status must never be accepted from browser input.

## Graceful degradation

Core school records remain usable when AI, email, SMS, GPS, storage, or payment providers are unavailable. The system must retain an in-app record, show the provider state, enqueue a retry where supported, and never fabricate delivery, payment, location, or synchronization success.
