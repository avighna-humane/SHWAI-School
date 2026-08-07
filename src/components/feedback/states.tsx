import { AlertTriangle, Inbox, Lock, RefreshCw, ShieldAlert, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { PLAN_BY_ID } from "@/config/plans";
import type { PlanId } from "@/types";

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-14 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-xl bg-primary-soft text-primary">
        {icon ?? <Inbox className="size-6" aria-hidden />}
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-danger/30 bg-danger-soft px-6 py-12 text-center">
      <AlertTriangle className="mb-3 size-6 text-danger" aria-hidden />
      <h3 className="text-base font-semibold">Something went wrong</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        {message ?? "We could not load this data. This is a simulated failure for demo purposes."}
      </p>
      {onRetry ? (
        <Button variant="outline" size="sm" className="mt-5" onClick={onRetry}>
          <RefreshCw className="size-4" aria-hidden /> Retry
        </Button>
      ) : null}
    </div>
  );
}

export function PermissionDenied({ role }: { role: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card px-6 py-14 text-center">
      <ShieldAlert className="mb-3 size-6 text-warning" aria-hidden />
      <h3 className="text-base font-semibold">You do not have access to this module</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        The <span className="font-medium text-foreground">{role}</span> role cannot open this page. Switch role from the
        top bar to explore it in the demo.
      </p>
    </div>
  );
}

export function FeatureLocked({ required, current }: { required: PlanId; current: PlanId }) {
  return (
    <div className="surface-panel flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-xl bg-ai-soft text-ai">
        <Lock className="size-6" aria-hidden />
      </div>
      <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-ai-soft px-2.5 py-1 text-xs font-semibold text-ai">
        {PLAN_BY_ID[required].name} feature
      </span>
      <h3 className="text-lg font-semibold">Upgrade to unlock this module</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        Your school is on the <span className="font-medium text-foreground">{PLAN_BY_ID[current].name}</span> plan. This
        module is part of {PLAN_BY_ID[required].name} ({PLAN_BY_ID[required].versions}).
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link to="/app/subscription">View plans</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/pricing">Compare features</Link>
        </Button>
      </div>
    </div>
  );
}

export function LoadingCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="surface-panel p-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-4 h-7 w-20" />
          <Skeleton className="mt-3 h-3 w-32" />
        </div>
      ))}
    </div>
  );
}

export function LoadingTable({ rows = 6 }: { rows?: number }) {
  return (
    <div className="surface-panel divide-y divide-border">
      <div className="p-4">
        <Skeleton className="h-4 w-40" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="h-3 flex-1" />
          <Skeleton className="hidden h-3 w-24 sm:block" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

export function ComingSoon({ label, eta, className }: { label: string; eta?: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-ai-soft px-2 py-0.5 text-[11px] font-semibold text-ai",
        className,
      )}
    >
      <Sparkles className="size-3" aria-hidden /> {label}
      {eta ? <span className="font-normal opacity-80">· {eta}</span> : null}
    </span>
  );
}
