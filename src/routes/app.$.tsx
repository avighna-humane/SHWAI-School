import { createFileRoute, useRouterState } from "@tanstack/react-router";
import * as Icons from "lucide-react";
import { useAppState } from "@/app/providers/app-state";
import { ALL_NAV_ITEMS } from "@/config/navigation";
import { planAllows } from "@/config/plans";
import { EmptyState, FeatureLocked, PermissionDenied } from "@/components/feedback/states";
import { ROLE_LABEL } from "@/config/roles";
import { Badge } from "@/components/ui/badge";
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
  if (item.plan && !planAllows(plan, item.plan))
    return <FeatureLocked required={item.plan} current={plan} />;

  return (
    <div className="relative space-y-6">
      <header>
        <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
          <span className="size-1.5 rounded-full bg-primary" /> SHWAI workspace
        </p>
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-3xl font-extrabold tracking-tight">{item.label}</h1>
          {item.badge ? (
            <Badge className="rounded-full bg-ai-soft px-2.5 text-ai">{item.badge}</Badge>
          ) : null}
        </div>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{item.description}</p>
      </header>

      <EmptyState
        title="No data available yet"
        description="Add or connect records to begin using this workspace."
        icon={<Icons.Database className="size-6" aria-hidden />}
        action={
          <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
            Available to: {item.roles.map((r) => ROLE_LABEL[r]).join(", ")}
          </Badge>
        }
      />
      <FloatingAI />
    </div>
  );
}
