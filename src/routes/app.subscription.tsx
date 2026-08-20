import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getBillingOverview } from "@/actions/billing";
import { useAppState } from "@/app/providers/app-state";
import { EmptyState, PermissionDenied } from "@/components/feedback/states";
import { FloatingAI } from "@/components/feedback/floating-ai";
import { BadgeCheck, CreditCard } from "lucide-react";
import { PLAN_BY_ID } from "@/config/plans";

export const Route = createFileRoute("/app/subscription")({ component: Subscription });

function displayDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleDateString() : "Not configured";
}

function Subscription() {
  const { role } = useAppState();
  const query = useQuery({
    queryKey: ["billing-overview"],
    queryFn: () => getBillingOverview(),
    enabled: role === "owner",
    retry: false,
  });

  if (role !== "owner") return <PermissionDenied role={role} />;

  return (
    <div className="relative space-y-6">
      <header>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
          Account
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight">Subscription</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Billing state is read from the school’s server-side subscription record and verified
          provider events.
        </p>
      </header>

      {query.isLoading ? (
        <div className="surface-panel p-6 text-sm text-muted-foreground">
          Loading billing state…
        </div>
      ) : query.isError ? (
        <EmptyState
          title="Billing state unavailable"
          description="The school billing record could not be read. No payment or renewal state is assumed."
          icon={<CreditCard className="size-6" aria-hidden />}
        />
      ) : query.data ? (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <div className="surface-panel p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Plan
              </p>
              <p className="mt-2 text-2xl font-bold">
                {PLAN_BY_ID[query.data.school.plan]?.name ?? query.data.school.plan}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">Server-derived entitlement plan</p>
            </div>
            <div className="surface-panel p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </p>
              <p className="mt-2 text-2xl font-bold capitalize">
                {query.data.subscription?.status ?? query.data.school.subscription_status}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Provider: {query.data.provider ?? "not configured"}
              </p>
            </div>
            <div className="surface-panel p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Renewal / period end
              </p>
              <p className="mt-2 text-2xl font-bold">
                {displayDate(query.data.subscription?.current_period_end)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Grace period: {displayDate(query.data.subscription?.grace_period_ends_at)}
              </p>
            </div>
          </section>

          <section className="surface-panel space-y-4 p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <BadgeCheck className="size-5 text-primary" aria-hidden />
              <h2 className="text-lg font-bold">Billing connection</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              {query.data.providerConfigured
                ? "A payment provider configuration is present. Checkout and webhook behavior still require provider sandbox verification."
                : "No payment provider is configured. Billing actions remain configuration-required and no paid access is fabricated."}
            </p>
            <div className="grid gap-3 text-sm sm:grid-cols-4">
              {Object.entries(query.data.usage).map(([label, value]) => (
                <div key={label} className="rounded-lg border border-border p-3">
                  <p className="text-xs capitalize text-muted-foreground">{label}</p>
                  <p className="mt-1 font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="surface-panel space-y-4 p-5 sm:p-6">
            <h2 className="text-lg font-bold">Invoices</h2>
            {query.data.invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No provider invoice has been synchronized for this school.
              </p>
            ) : (
              <div className="space-y-2">
                {query.data.invoices.map((invoice) => (
                  <div
                    key={invoice.provider_invoice_id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm"
                  >
                    <div>
                      <p className="font-semibold">{invoice.provider_invoice_id}</p>
                      <p className="text-xs text-muted-foreground">
                        {invoice.currency} {invoice.amount_minor} · due{" "}
                        {displayDate(invoice.due_at)}
                      </p>
                    </div>
                    <span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold capitalize">
                      {invoice.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
      <FloatingAI />
    </div>
  );
}
