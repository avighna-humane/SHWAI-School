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
    <div className="space-y-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-2xl font-bold tracking-tight">{item.label}</h1>
            {item.badge ? <Badge className="shrink-0 bg-ai-soft text-ai">{item.badge}</Badge> : null}
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{item.description}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={() => toast.success("Export queued — mock file ready")}>
            <Icons.Download className="size-4" aria-hidden /> Export
          </Button>
          <Button size="sm" onClick={() => toast.success("Recorded in this frontend demo")}>
            <Icons.Plus className="size-4" aria-hidden /> New
          </Button>
        </div>
      </header>

      <EmptyState
        title={`${item.label} workspace is being wired up`}
        description="Navigation, permissions, plan gating and mock data for this module are in place. The detailed screen for this module is part of the next build pass."
        icon={<Icons.LayoutGrid className="size-6" aria-hidden />}
        action={
          <Badge variant="outline" className="text-xs">
            Visible to: {item.roles.map((r) => ROLE_LABEL[r]).join(", ")}
          </Badge>
        }
      />
    </div>
  );
}
