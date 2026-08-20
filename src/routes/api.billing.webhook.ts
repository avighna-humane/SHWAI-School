import { createFileRoute } from "@tanstack/react-router";
import { requireDatabase } from "@/lib/db";
import {
  billingConfigured,
  processBillingWebhook,
  verifyBillingSignature,
  type BillingEvent,
  type BillingEventType,
} from "@/lib/billing";

const EVENT_TYPES = new Set<BillingEventType>([
  "subscription.created",
  "subscription.updated",
  "subscription.canceled",
  "invoice.paid",
  "invoice.payment_failed",
]);

export const Route = createFileRoute("/api/billing/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!billingConfigured()) {
          return Response.json({ error: "Billing provider is not configured" }, { status: 503 });
        }
        const raw = await request.text();
        if (raw.length > 1_000_000) {
          return Response.json({ error: "Webhook payload is too large" }, { status: 413 });
        }
        const signature = request.headers.get("x-shwai-billing-signature") ?? "";
        if (!(await verifyBillingSignature(raw, signature))) {
          return Response.json({ error: "Invalid webhook signature" }, { status: 401 });
        }
        let event: BillingEvent;
        try {
          const parsed = JSON.parse(raw) as Partial<BillingEvent>;
          if (
            typeof parsed.id !== "string" ||
            !EVENT_TYPES.has(parsed.type as BillingEventType) ||
            !parsed.data ||
            typeof parsed.data !== "object" ||
            !parsed.data.object ||
            typeof parsed.data.object !== "object"
          ) {
            throw new Error("Invalid billing event");
          }
          event = parsed as BillingEvent;
        } catch {
          return Response.json({ error: "Invalid billing event" }, { status: 400 });
        }
        try {
          const result = await processBillingWebhook(
            requireDatabase(),
            process.env.PAYMENT_PROVIDER!.trim(),
            event,
          );
          if (result.kind === "unmapped") {
            return Response.json(
              { error: "Billing event has no server-side school mapping" },
              { status: 409 },
            );
          }
          return Response.json({ ok: true, status: result.kind });
        } catch {
          return Response.json({ error: "Billing webhook processing failed" }, { status: 500 });
        }
      },
    },
  },
});
