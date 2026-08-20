# SHWAI billing and entitlements

**Current classification:** `PARTIAL SERVER BOUNDARY — NOT READY FOR LIVE SALES`. The repository now has durable subscription, invoice, webhook-event, and provider-customer tables; signed webhook verification; duplicate-event idempotency; subscription/payment-failure/cancellation state transitions; and server-side plan-plus-status entitlement checks. It still does not provide a verified provider checkout or evidence from a provider sandbox.

The active plan and subscription status are read from the authenticated school context and reconciled database state rather than accepted from browser state. The owner subscription page reads persisted billing records and shows empty/configuration-required states when no provider data exists. It never fabricates an invoice, renewal date, payment method, or successful purchase.

## Implemented server boundary

The public endpoint `POST /api/billing/webhook` requires `PAYMENT_PROVIDER`, `PAYMENT_API_KEY`, and `PAYMENT_WEBHOOK_SECRET`. It verifies an HMAC-SHA256 digest over the raw request body supplied in `x-shwai-billing-signature`, rejects oversized or malformed payloads, stores event IDs for idempotency, maps provider customer/subscription IDs to a school, and applies only the supported event types:

| Event                                           | Server behavior                                                                                                          |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `subscription.created` / `subscription.updated` | Upsert the school subscription, plan, provider status, trial/renewal/cancellation timestamps, and raw provider state.    |
| `subscription.canceled`                         | Reconcile the subscription and school status to `canceled`; entitlement checks stop treating the subscription as active. |
| `invoice.paid`                                  | Persist a paid invoice and reconcile the associated subscription to `active`.                                            |
| `invoice.payment_failed`                        | Persist a failed invoice and place the subscription in `past_due` with a seven-day grace-period timestamp.               |

Every processed event is recorded in `hw_billing_webhook_events` and emits an audit/security event. An event with no server-side school mapping is rejected with a conflict response and remains marked failed for operator inspection. The provider payload is not allowed to choose a school ID directly.

## Still required for live billing

The application does not yet create provider customers, create provider-hosted checkout sessions, open a customer billing portal, reconcile provider state on a scheduled basis, calculate invoices locally, or provide a tested payment-provider adapter. Those items require a concrete provider choice, provider sandbox credentials, legal/tax configuration, and deployment evidence. A deployment must not advertise paid checkout merely because the environment variables are present.

| Concern            | Current status                                                         | Production evidence still required                                       |
| ------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Customer mapping   | Schema and webhook lookup exist; creation is not implemented.          | Provider customer creation and one-school mapping test.                  |
| Checkout           | Not implemented.                                                       | Provider-hosted checkout session and cancellation behavior.              |
| Subscription state | Implemented for signed supported events.                               | Provider sandbox event fixtures and retry/replay tests.                  |
| Invoice state      | Persisted for signed invoice events.                                   | Provider invoice fixture, tax/amount semantics, and reconciliation test. |
| Entitlements       | Server-side plan/status guard implemented for AI and data portability. | Product-wide entitlement inventory and provider-backed acceptance tests. |
| Reconciliation     | Not implemented.                                                       | Scheduled/operator-triggered comparison and discrepancy workflow.        |
| Refunds/disputes   | Not implemented.                                                       | Provider event mapping, audit trail, and finance ownership.              |

Until those remaining items are implemented and tested against a provider sandbox, do not represent SHWAI as having live paid checkout or a commercially verified payment flow.
