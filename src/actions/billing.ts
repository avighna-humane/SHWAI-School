import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth";
import { requireDatabase } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import { billingConfigured } from "@/lib/billing";

export const getBillingOverview = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  requirePermission(context, "billing.manage");
  const sql = requireDatabase();
  const [schoolRows, subscriptionRows, invoiceRows, usageRows] = await Promise.all([
    sql<
      {
        plan: "starter" | "professional" | "enterprise";
        subscription_status: string;
        name: string;
      }[]
    >`
      SELECT name, plan, subscription_status FROM hw_schools WHERE id = ${context.schoolId} LIMIT 1`,
    sql<
      {
        provider: string;
        provider_subscription_id: string;
        plan: "starter" | "professional" | "enterprise";
        status: string;
        trial_ends_at: string | null;
        current_period_end: string | null;
        grace_period_ends_at: string | null;
        cancel_at_period_end: boolean;
      }[]
    >`
      SELECT provider, provider_subscription_id, plan, status, trial_ends_at, current_period_end, grace_period_ends_at, cancel_at_period_end
      FROM hw_billing_subscriptions WHERE school_id = ${context.schoolId} LIMIT 1`,
    sql<
      {
        provider_invoice_id: string;
        amount_minor: number;
        currency: string;
        status: string;
        hosted_invoice_url: string;
        due_at: string | null;
        paid_at: string | null;
      }[]
    >`
      SELECT provider_invoice_id, amount_minor, currency, status, hosted_invoice_url, due_at, paid_at
      FROM hw_billing_invoices WHERE school_id = ${context.schoolId} ORDER BY created_at DESC LIMIT 50`,
    sql<{ students: number; teachers: number; parents: number; staff: number }[]>`
      SELECT
        (SELECT COUNT(*)::int FROM hw_students WHERE school_id = ${context.schoolId}) AS students,
        (SELECT COUNT(*)::int FROM hw_teachers WHERE school_id = ${context.schoolId}) AS teachers,
        (SELECT COUNT(*)::int FROM hw_parents WHERE school_id = ${context.schoolId}) AS parents,
        (SELECT COUNT(*)::int FROM hw_staff WHERE school_id = ${context.schoolId}) AS staff`,
  ]);

  return {
    providerConfigured: billingConfigured(),
    provider: process.env.PAYMENT_PROVIDER?.trim() || null,
    school: schoolRows[0] ?? {
      name: context.schoolName,
      plan: context.plan,
      subscription_status: context.subscriptionStatus,
    },
    subscription: subscriptionRows[0] ?? null,
    invoices: invoiceRows,
    usage: usageRows[0] ?? { students: 0, teachers: 0, parents: 0, staff: 0 },
  };
});
