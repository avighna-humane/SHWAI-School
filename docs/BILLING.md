# SHWAI billing and entitlements

**Current classification:** `NOT IMPLEMENTED FOR LIVE BILLING` with server-side plan context and feature minimums present.

The application contains Starter, Professional, and Enterprise plan identifiers and server-side plan feature checks. The active plan and subscription status are read from the authenticated school context rather than accepted from browser state. The subscription page is an informational surface; it is not evidence of a provider-hosted checkout or paid entitlement.

## Not yet implemented

The repository does not currently provide a verified provider checkout, customer creation, invoice synchronization, payment-failure handling, grace-period state machine, cancellation flow, or signed webhook reconciliation. Razorpay or another provider may be integrated only through a server-side adapter with signature verification, idempotency keys, auditable state transitions, and provider sandbox evidence.

## Required production integration

A live billing implementation must add a provider abstraction with the following server-owned records and transitions:

| Concern        | Required behavior                                                                               |
| -------------- | ----------------------------------------------------------------------------------------------- |
| Customer       | Create and map one provider customer to one school organization.                                |
| Subscription   | Store provider ID, plan, status, trial, renewal, cancellation, and grace-period timestamps.     |
| Webhook        | Verify the provider signature before applying any state transition.                             |
| Idempotency    | Reject duplicate event IDs and make retries safe.                                               |
| Entitlements   | Derive feature access from the reconciled server subscription, never a frontend success screen. |
| Audit          | Record plan changes, payment failures, cancellations, and operator overrides.                   |
| Reconciliation | Provide a periodic or operator-triggered comparison between provider and local state.           |

Until those items are implemented and tested against a provider sandbox, do not advertise paid checkout or claim that a school has purchased a plan through SHWAI.
