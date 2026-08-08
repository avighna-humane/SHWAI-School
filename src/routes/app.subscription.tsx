import { createFileRoute } from "@tanstack/react-router";
import { useAppState } from "@/app/providers/app-state";
import { EmptyState, PermissionDenied } from "@/components/feedback/states";
import { FloatingAI } from "@/components/feedback/floating-ai";
import { BadgeCheck } from "lucide-react";

export const Route = createFileRoute("/app/subscription")({ component: Subscription });

function Subscription() {
  const { role } = useAppState();

  if (role !== "owner") return <PermissionDenied role={role} />;

  return (
    <div className="relative space-y-6">
      <header>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Account</p>
        <h1 className="text-3xl font-extrabold tracking-tight">Subscription</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Subscription information is shown here for the School Owner account.
        </p>
      </header>

      <EmptyState
        title="No active subscription"
        description="No subscription, billing status, payment method, renewal date, or billing history is connected to this workspace yet."
        icon={<BadgeCheck className="size-6" aria-hidden />}
      />
      <FloatingAI />
    </div>
  );
}