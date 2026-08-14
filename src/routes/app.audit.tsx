import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import * as Icons from "lucide-react";
import { useAppState } from "@/app/providers/app-state";
import { listAuditEvents } from "@/actions/audit";
import { withTimeout } from "@/lib/request-timeout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/audit")({ component: AuditPage });

function AuditPage() {
  const { school, role } = useAppState();
  const query = useQuery({
    queryKey: ["audit-events", school.id, role],
    queryFn: () =>
      withTimeout(
        listAuditEvents({
          data: {
            schoolId: school.id,
            actorSchoolId: school.id,
            actorRole: role as "principal" | "admin" | "owner",
            limit: 100,
          },
        }),
      ),
    enabled: typeof window !== "undefined" && ["principal", "admin", "owner"].includes(role),
  });

  if (!["principal", "admin", "owner"].includes(role)) {
    return (
      <div className="surface-panel flex min-h-64 flex-col items-center justify-center p-8 text-center">
        <Icons.LockKeyhole className="size-10 text-muted-foreground/50" />
        <h1 className="mt-3 text-xl font-bold">Audit access is restricted</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Only principal, administrator and owner roles can inspect school audit events.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
            <span className="size-1.5 rounded-full bg-primary" />
            Governance workspace
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight">Audit logs</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Persisted school-scoped records for sensitive edits, AI decisions, exports and workflow
            changes. The server applies the school boundary before returning events.
          </p>
        </div>
        <Badge variant="outline" className="rounded-full bg-card">
          {school.name}
        </Badge>
      </header>
      {query.isLoading ? (
        <div className="surface-panel flex min-h-64 items-center justify-center text-sm text-muted-foreground">
          <Icons.Loader2 className="mr-2 size-5 animate-spin" />
          Loading persisted audit events…
        </div>
      ) : query.isError ? (
        <div className="surface-panel flex min-h-64 flex-col items-center justify-center p-8 text-center">
          <Icons.DatabaseZap className="size-10 text-warning" />
          <h2 className="mt-3 font-semibold">Audit storage is unavailable</h2>
          <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
            {(query.error as Error).message}
          </p>
          <Button variant="outline" className="mt-4" onClick={() => query.refetch()}>
            <Icons.RefreshCw className="mr-2 size-4" />
            Retry
          </Button>
        </div>
      ) : query.data?.length ? (
        <section className="surface-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-border p-5 sm:p-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Server records
              </p>
              <h2 className="mt-1 text-xl font-bold tracking-tight">Recent events</h2>
            </div>
            <Badge className="rounded-full bg-muted text-muted-foreground">
              {query.data.length} events
            </Badge>
          </div>
          <div className="divide-y divide-border">
            {query.data.map((event) => (
              <div key={event.id} className="flex flex-wrap items-start gap-3 p-4 sm:px-6">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                  <Icons.ScrollText className="size-4" />
                </span>
                <div className="min-w-[220px] flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{event.entity}</p>
                    <Badge variant="outline" className="rounded-full text-[10px]">
                      {event.action}
                    </Badge>
                    <Badge variant="outline" className="rounded-full text-[10px]">
                      {event.actor_role}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {event.detail} · entity {event.entity_id}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(event.created_at).toLocaleString("en-IN")}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <div className="surface-panel flex min-h-64 flex-col items-center justify-center p-8 text-center">
          <Icons.ScrollText className="size-10 text-muted-foreground/40" />
          <h2 className="mt-3 font-semibold">No persisted audit events yet</h2>
          <p className="mt-1 max-w-lg text-sm leading-6 text-muted-foreground">
            Sensitive actions will appear here after the database migration is applied and a
            workflow is saved.
          </p>
        </div>
      )}
    </div>
  );
}
