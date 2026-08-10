import { createFileRoute } from "@tanstack/react-router";
import { useAppState } from "@/app/providers/app-state";
import { EmptyState } from "@/components/feedback/states";
import { FloatingAI } from "@/components/feedback/floating-ai";
import { Bell } from "lucide-react";

export const Route = createFileRoute("/app/notifications")({ component: NotificationCentre });

function NotificationCentre() {
  useAppState();

  return (
    <div className="relative space-y-6">
      <header>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Stay in the loop</p>
        <h1 className="text-3xl font-extrabold tracking-tight">Notification centre</h1>
        <p className="mt-2 text-sm text-muted-foreground">Connected alerts will appear here when available.</p>
      </header>
      <EmptyState title="No notifications yet" description="Alerts will appear here after a connected school system sends them." icon={<Bell className="size-6" aria-hidden />} />
      <FloatingAI />
    </div>
  );
}
