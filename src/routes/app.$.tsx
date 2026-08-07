import { createFileRoute, useRouterState } from "@tanstack/react-router";
import * as Icons from "lucide-react";
import { useAppState } from "@/app/providers/app-state";
import { ALL_NAV_ITEMS } from "@/config/navigation";
import { planAllows } from "@/config/plans";
import { EmptyState, FeatureLocked, PermissionDenied } from "@/components/feedback/states";
import { ROLE_LABEL } from "@/config/roles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FloatingAI } from "@/components/feedback/floating-ai";

export const Route = createFileRoute("/app/$")({ component: ModuleWorkspace });

function ModuleWorkspace() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { role, plan } = useAppState();
  const item = ALL_NAV_ITEMS.find((i) => i.path === pathname);

  if (!item) {
    return (
      <EmptyState
        title="Module not found"
        description={`No SHWAI module is mapped to ${pathname}. Use the command palette (⌘K) to jump to a module.`}
        icon={<Icons.CircleHelp className="size-6" aria-hidden />}
      />
    );
  }
  if (!item.roles.includes(role)) return <PermissionDenied role={ROLE_LABEL[role]} />;
  if (item.plan && !planAllows(plan, item.plan)) return <FeatureLocked required={item.plan} current={plan} />;

  return (
    <div className="relative space-y-6">
      <header className="grid gap-5 sm:flex sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">SHWAI workspace</p>
          <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            <h1 className="truncate text-3xl font-extrabold tracking-tight">{item.label}</h1>
            {item.badge ? <Badge className="rounded-full bg-ai-soft px-2.5 text-ai">{item.badge}</Badge> : null}
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{item.description}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => toast.success("Export queued — mock file ready")}>
            <Icons.Download className="size-4" aria-hidden /> Export
          </Button>
          <Button size="sm" className="rounded-full" onClick={() => toast.success("Recorded in this frontend demo")}>
            <Icons.Plus className="size-4" aria-hidden /> New
          </Button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <EmptyState
          title={`${item.label} workspace is being wired up`}
          description="Navigation, permissions, plan gating and mock data for this module are in place. The detailed screen for this module is part of the next build pass."
          icon={<Icons.LayoutGrid className="size-6" aria-hidden />}
          action={
            <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
              Visible to: {item.roles.map((r) => ROLE_LABEL[r]).join(", ")}
            </Badge>
          }
        />
        <aside className="surface-panel hidden h-fit p-5 lg:block">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
            <Icons.Sparkles className="size-4" aria-hidden /> Quick context
          </p>
          <p className="mt-3 text-sm font-semibold">Your workspace is ready to explore.</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Use the protected navigation to move between modules. Demo actions remain safely in your browser.
          </p>
        </aside>
      </div>
      <FloatingAI />
    </div>
  );
}
