import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Icons from "lucide-react";
import { useAppState } from "@/app/providers/app-state";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/actions/notifications";
import { Button } from "@/components/ui/button";
import { FloatingAI } from "@/components/feedback/floating-ai";
import { toast } from "sonner";

export const Route = createFileRoute("/app/notifications")({ component: NotificationCentre });

function NotificationCentre() {
  const { schoolId } = useAppState();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["persisted-notifications", schoolId],
    queryFn: () => listNotifications(),
    enabled: Boolean(schoolId) && typeof window !== "undefined",
  });
  const markAll = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["persisted-notifications", schoolId] });
      toast.success("Notifications marked as read");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const markOne = useMutation({
    mutationFn: (id: string) => markNotificationRead({ data: { id } }),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["persisted-notifications", schoolId] }),
    onError: (error: Error) => toast.error(error.message),
  });
  const notifications = query.data ?? [];
  const unread = notifications.filter((notification) => !notification.read_at).length;
  return (
    <div className="relative space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
            Persisted communication
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight">Notification centre</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Notifications are stored per recipient and school. No fake push or email delivery is
            claimed.
          </p>
        </div>
        {unread ? (
          <Button variant="outline" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
            Mark all read
          </Button>
        ) : null}
      </header>
      {query.isLoading ? (
        <State
          title="Loading notifications…"
          body="The server is resolving your authenticated recipient scope."
          icon={<Icons.Loader2 className="size-8 animate-spin" />}
        />
      ) : query.isError ? (
        <State
          title="Notifications are unavailable"
          body={(query.error as Error).message}
          icon={<Icons.DatabaseZap className="size-8 text-danger/70" />}
          retry={() => query.refetch()}
        />
      ) : notifications.length === 0 ? (
        <State
          title="No notifications yet"
          body="Application-level notifications will appear here after an authorized school event or announcement."
          icon={<Icons.Bell className="size-8 text-muted-foreground/50" />}
        />
      ) : (
        <section className="surface-panel divide-y">
          {notifications.map((notification) => (
            <button
              key={notification.id}
              className="flex w-full gap-3 p-4 text-left transition-colors hover:bg-muted/30"
              onClick={() => markOne.mutate(notification.id)}
            >
              <span
                className={`mt-1 grid size-8 shrink-0 place-items-center rounded-full ${notification.read_at ? "bg-muted text-muted-foreground" : "bg-primary-soft text-primary"}`}
              >
                <Icons.Bell className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={`block text-sm ${notification.read_at ? "font-medium" : "font-bold"}`}
                >
                  {notification.title}
                </span>
                <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                  {notification.body}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {new Date(notification.created_at).toLocaleString()}
                </span>
              </span>
            </button>
          ))}
        </section>
      )}
      <FloatingAI />
    </div>
  );
}

function State({
  title,
  body,
  icon,
  retry,
}: {
  title: string;
  body: string;
  icon: React.ReactNode;
  retry?: () => void;
}) {
  return (
    <div className="surface-panel flex min-h-48 flex-col items-center justify-center p-8 text-center">
      {icon}
      <h2 className="mt-3 font-semibold">{title}</h2>
      <p className="mt-1 max-w-lg text-sm leading-6 text-muted-foreground">{body}</p>
      {retry ? (
        <Button className="mt-4" variant="outline" onClick={retry}>
          <Icons.RefreshCw className="mr-2 size-4" />
          Retry
        </Button>
      ) : null}
    </div>
  );
}
