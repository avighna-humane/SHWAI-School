import { createFileRoute } from "@tanstack/react-router";
import { useAppState } from "@/app/providers/app-state";
import { NOTIFICATIONS } from "@/data/mock/platform";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/feedback/states";
import { cn } from "@/lib/utils";
import { FloatingAI } from "@/components/feedback/floating-ai";

export const Route = createFileRoute("/app/notifications")({ component: NotificationCentre });

function NotificationCentre() {
  const { role, isRead, markRead, markUnread, markAllRead, unreadCount } = useAppState();
  const items = NOTIFICATIONS.filter((n) => n.roles.includes(role));

  return (
    <div className="relative space-y-6">
      <header className="grid gap-4 sm:flex sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Stay in the loop</p>
          <h1 className="text-3xl font-extrabold tracking-tight">Notification centre</h1>
          <p className="mt-2 text-sm text-muted-foreground">{unreadCount} unread for your role</p>
        </div>
        <Button variant="outline" size="sm" className="w-fit rounded-full" onClick={markAllRead}>
          Mark all read
        </Button>
      </header>

      {items.length === 0 ? (
        <EmptyState title="No notifications yet" description="Alerts for your role will appear here as the school day progresses." />
      ) : (
        <ul className="surface-panel divide-y divide-border overflow-hidden">
          {items.map((n) => (
            <li key={n.id} className="flex flex-wrap items-start gap-3 p-5 transition-colors hover:bg-primary-soft/30">
              <span
                className={cn(
                  "mt-1.5 size-2 shrink-0 rounded-full",
                  n.severity === "critical" ? "bg-danger" : n.severity === "warning" ? "bg-warning" : n.severity === "success" ? "bg-success" : "bg-primary",
                  isRead(n.id) && "opacity-25",
                )}
              />
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm", !isRead(n.id) && "font-semibold")}>{n.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {n.createdAt} · <span className="capitalize">{n.category}</span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="outline" className="rounded-full text-[10px] capitalize">{n.severity}</Badge>
                <Button variant="ghost" size="sm" onClick={() => (isRead(n.id) ? markUnread(n.id) : markRead(n.id))}>
                  {isRead(n.id) ? "Mark unread" : "Mark read"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <FloatingAI />
    </div>
  );
}
