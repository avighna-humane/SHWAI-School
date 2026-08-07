import { createFileRoute } from "@tanstack/react-router";
import { Check, Lock } from "lucide-react";
import { useAppState } from "@/app/providers/app-state";
import { PLANS, USAGE_LIMITS, planAllows } from "@/config/plans";
import { ALL_NAV_ITEMS } from "@/config/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { FloatingAI } from "@/components/feedback/floating-ai";

export const Route = createFileRoute("/app/subscription")({ component: Subscription });

function Subscription() {
  const { plan, setPlan, school } = useAppState();
  const gated = ALL_NAV_ITEMS.filter((i) => i.plan);

  return (
    <div className="relative space-y-6">
      <header>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Plan & usage</p>
        <h1 className="text-3xl font-extrabold tracking-tight">Subscription</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {school.name} · {school.students} students · switching plans here is a demo-only action.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-3">
        {PLANS.map((p) => {
          const active = p.id === plan;
          return (
            <article key={p.id} className={`surface-panel flex flex-col p-6 transition-transform hover:-translate-y-0.5 ${active ? "ring-2 ring-primary" : ""}`}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">{p.name}</h2>
                 {active ? <Badge className="rounded-full bg-primary-soft text-primary">Current plan</Badge> : null}
              </div>
              <p className="text-xs text-muted-foreground">{p.versions}</p>
              <p className="mt-4 text-2xl font-extrabold text-numeric">₹{p.priceMin}–{p.priceMax}</p>
              <p className="text-xs text-muted-foreground">{p.priceUnit}</p>
              <ul className="mt-4 space-y-1.5 text-sm">
                {p.includes.slice(0, 6).map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /> {f}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-6"
                variant={active ? "outline" : "default"}
                disabled={active}
                onClick={() => {
                  setPlan(p.id);
                  toast.success(`Demo plan switched to ${p.name}`);
                }}
              >
                {active ? "Active" : `Switch to ${p.name}`}
              </Button>
            </article>
          );
        })}
      </section>

      <section className="surface-panel p-5">
        <h2 className="text-sm font-semibold">Usage limits</h2>
        <ul className="mt-4 space-y-4">
          {USAGE_LIMITS.map((u) => (
            <li key={u.label}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{u.label}</span>
                <span className="text-numeric text-xs text-muted-foreground">
                  {u.used.toLocaleString("en-IN")} / {u.limit.toLocaleString("en-IN")} {u.unit}
                </span>
              </div>
              <Progress value={(u.used / u.limit) * 100} className="mt-1.5 h-1.5" />
            </li>
          ))}
        </ul>
      </section>

      <section className="surface-panel p-5">
        <h2 className="text-sm font-semibold">Feature access in your plan</h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {gated.map((i) => {
            const allowed = planAllows(plan, i.plan!);
            return (
              <li key={i.path} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                {allowed ? <Check className="size-4 shrink-0 text-success" aria-hidden /> : <Lock className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
                <span className="min-w-0 flex-1 truncate">{i.label}</span>
                <Badge variant={allowed ? "secondary" : "outline"} className="shrink-0 text-[10px]">
                  {allowed ? "Included in your plan" : i.plan === "enterprise" ? "Enterprise only" : "Professional"}
                </Badge>
              </li>
            );
          })}
        </ul>
      </section>
      <FloatingAI />
    </div>
  );
}
