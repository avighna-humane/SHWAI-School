import { constantTimeEqual, recordSecurityEvent } from "@/lib/security";
import { requireDatabase } from "@/lib/db";

export type BillingEventType =
  | "subscription.created"
  | "subscription.updated"
  | "subscription.canceled"
  | "invoice.paid"
  | "invoice.payment_failed";

export type BillingEvent = {
  id: string;
  type: BillingEventType;
  data: {
    object: {
      id?: string;
      customer?: string;
      subscription?: string;
      status?: string;
      plan?: string;
      plan_id?: string;
      trial_end?: string | number | null;
      current_period_start?: string | number | null;
      current_period_end?: string | number | null;
      cancel_at_period_end?: boolean;
      canceled_at?: string | number | null;
      amount_paid?: number;
      amount_due?: number;
      amount?: number;
      currency?: string;
      hosted_invoice_url?: string;
      due_date?: string | number | null;
      paid_at?: string | number | null;
      [key: string]: unknown;
    };
  };
};

type BillingSql = ReturnType<typeof requireDatabase>;

const PLAN_IDS = new Set(["starter", "professional", "enterprise"]);
const STATUS_MAP: Record<string, BillingEvent["data"]["object"]["status"]> = {
  trialing: "trialing",
  active: "active",
  past_due: "past_due",
  grace_period: "grace_period",
  canceled: "canceled",
  incomplete: "incomplete",
  paused: "paused",
};

export function billingConfigured() {
  return Boolean(
    process.env.PAYMENT_PROVIDER?.trim() &&
    process.env.PAYMENT_API_KEY?.trim() &&
    process.env.PAYMENT_WEBHOOK_SECRET?.trim(),
  );
}

export async function verifyBillingSignature(body: string, signature: string) {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET?.trim();
  if (!secret || !signature) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)),
  );
  const hexadecimal = Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
  const base64 = btoa(String.fromCharCode(...digest));
  return (
    constantTimeEqual(
      new TextEncoder().encode(signature.trim()),
      new TextEncoder().encode(hexadecimal),
    ) ||
    constantTimeEqual(new TextEncoder().encode(signature.trim()), new TextEncoder().encode(base64))
  );
}

function asDate(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const date =
    typeof value === "number"
      ? new Date(value < 10_000_000_000 ? value * 1000 : value)
      : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizedPlan(eventObject: BillingEvent["data"]["object"]) {
  const candidate = String(eventObject.plan_id ?? eventObject.plan ?? "").toLowerCase();
  return PLAN_IDS.has(candidate) ? candidate : null;
}

function normalizedStatus(event: BillingEvent) {
  if (event.type === "subscription.canceled") return "canceled";
  if (event.type === "invoice.paid") return "active";
  if (event.type === "invoice.payment_failed") return "past_due";
  return STATUS_MAP[String(event.data.object.status ?? "").toLowerCase()] ?? null;
}

export async function processBillingWebhook(
  sql: BillingSql,
  provider: string,
  event: BillingEvent,
) {
  const object = event.data.object;
  const subscriptionId = String(
    object.subscription ?? (event.type.startsWith("subscription.") ? (object.id ?? "") : ""),
  );
  const customerId = String(object.customer ?? "");
  const plan = normalizedPlan(object);
  const status = normalizedStatus(event);
  const result = await sql.begin(async (tx) => {
    const inserted = await tx<{ event_id: string }[]>`
      INSERT INTO hw_billing_webhook_events (provider, event_id, event_type)
      VALUES (${provider}, ${event.id}, ${event.type})
      ON CONFLICT (provider, event_id) DO UPDATE SET status = 'received', failure_reason = ''
      WHERE hw_billing_webhook_events.status = 'failed'
      RETURNING event_id`;
    if (!inserted[0]) return { kind: "duplicate" as const };

    const subscriptionRows = await tx<{ school_id: string; plan: string }[]>`
      SELECT school_id, plan FROM hw_billing_subscriptions
      WHERE provider = ${provider}
        AND (${subscriptionId} <> '' AND provider_subscription_id = ${subscriptionId})
      LIMIT 1`;
    const customerRows = customerId
      ? await tx<{ school_id: string; plan: string }[]>`
          SELECT school_id, COALESCE((SELECT plan FROM hw_billing_subscriptions s WHERE s.school_id = c.school_id), 'starter') AS plan
          FROM hw_billing_customers c
          WHERE provider = ${provider} AND provider_customer_id = ${customerId}
          LIMIT 1`
      : [];
    const mapping = subscriptionRows[0] ?? customerRows[0];
    if (!mapping) {
      await tx`
        UPDATE hw_billing_webhook_events
        SET status = 'failed', failure_reason = 'No school mapping for provider customer/subscription'
        WHERE provider = ${provider} AND event_id = ${event.id}`;
      return { kind: "unmapped" as const };
    }

    const nextPlan = plan ?? (mapping.plan as "starter" | "professional" | "enterprise");
    const nextStatus = status ?? "active";
    if (subscriptionId) {
      const updated = await tx<{ id: string }[]>`
        UPDATE hw_billing_subscriptions
        SET plan = ${nextPlan}, status = ${nextStatus},
            provider_customer_id = COALESCE(NULLIF(${customerId}, ''), provider_customer_id),
            trial_ends_at = COALESCE(${asDate(object.trial_end)}, trial_ends_at),
            current_period_start = COALESCE(${asDate(object.current_period_start)}, current_period_start),
            current_period_end = COALESCE(${asDate(object.current_period_end)}, current_period_end),
            grace_period_ends_at = CASE WHEN ${nextStatus} = 'past_due' THEN NOW() + INTERVAL '7 days' ELSE grace_period_ends_at END,
            cancel_at_period_end = COALESCE(${object.cancel_at_period_end ?? null}, cancel_at_period_end),
            canceled_at = COALESCE(${asDate(object.canceled_at)}, canceled_at),
            raw_provider_state = ${JSON.stringify(object)}::JSONB,
            updated_at = NOW()
        WHERE school_id = ${mapping.school_id} AND provider = ${provider} AND provider_subscription_id = ${subscriptionId}
        RETURNING id`;
      if (!updated[0]) {
        await tx`
          INSERT INTO hw_billing_subscriptions
            (school_id, provider, provider_subscription_id, provider_customer_id, plan, status, trial_ends_at, current_period_start, current_period_end, grace_period_ends_at, cancel_at_period_end, canceled_at, raw_provider_state)
          VALUES
            (${mapping.school_id}, ${provider}, ${subscriptionId}, ${customerId}, ${nextPlan}, ${nextStatus}, ${asDate(object.trial_end)}, ${asDate(object.current_period_start)}, ${asDate(object.current_period_end)}, ${nextStatus === "past_due" ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null}, ${object.cancel_at_period_end ?? false}, ${asDate(object.canceled_at)}, ${JSON.stringify(object)}::JSONB)
          ON CONFLICT (school_id) DO UPDATE SET provider_subscription_id = EXCLUDED.provider_subscription_id, provider_customer_id = EXCLUDED.provider_customer_id, plan = EXCLUDED.plan, status = EXCLUDED.status, raw_provider_state = EXCLUDED.raw_provider_state, updated_at = NOW()`;
      }
    }
    await tx`
      UPDATE hw_schools
      SET plan = ${nextPlan}, subscription_status = ${nextStatus}, updated_at = NOW()
      WHERE id = ${mapping.school_id}`;

    const invoiceId = event.type.startsWith("invoice.") ? String(object.id ?? "") : "";
    if (invoiceId) {
      const invoiceStatus =
        event.type === "invoice.paid"
          ? "paid"
          : event.type === "invoice.payment_failed"
            ? "failed"
            : "open";
      await tx`
        INSERT INTO hw_billing_invoices
          (school_id, provider, provider_invoice_id, provider_subscription_id, amount_minor, currency, status, hosted_invoice_url, due_at, paid_at, raw_provider_state)
        VALUES
          (${mapping.school_id}, ${provider}, ${invoiceId}, ${subscriptionId || null}, ${object.amount_paid ?? object.amount_due ?? object.amount ?? 0}, ${String(
            object.currency ?? "INR",
          )
            .toUpperCase()
            .slice(
              0,
              8,
            )}, ${invoiceStatus}, ${String(object.hosted_invoice_url ?? "")}, ${asDate(object.due_date)}, ${asDate(object.paid_at) ?? (invoiceStatus === "paid" ? new Date().toISOString() : null)}, ${JSON.stringify(object)}::JSONB)
        ON CONFLICT (provider_invoice_id) DO UPDATE SET status = EXCLUDED.status, paid_at = EXCLUDED.paid_at, raw_provider_state = EXCLUDED.raw_provider_state, updated_at = NOW()`;
    }
    await tx`
      UPDATE hw_billing_webhook_events
      SET status = 'processed', processed_at = NOW()
      WHERE provider = ${provider} AND event_id = ${event.id}`;
    return {
      kind: "processed" as const,
      schoolId: mapping.school_id,
      status: nextStatus,
      plan: nextPlan,
    };
  });

  if (result.kind === "processed") {
    await recordSecurityEvent(sql, {
      eventType: "billing_webhook",
      outcome: "allowed",
      severity: result.status === "past_due" || result.status === "canceled" ? "warning" : "info",
      context: { schoolId: result.schoolId, role: "owner" },
      resource: "billing.webhook",
      detail: {
        provider,
        eventType: event.type,
        eventId: event.id,
        status: result.status,
        plan: result.plan,
      },
    });
  }
  return result;
}
