import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Icons from "lucide-react";
import {
  listOfflineOperations,
  recordOfflineOperation,
  resolveOfflineConflict,
} from "@/actions/operations";
import { useAppState } from "@/app/providers/app-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function OfflineWorkspace() {
  const { schoolId, offline } = useAppState();
  const queryClient = useQueryClient();
  const operations = useQuery({
    queryKey: ["v5-offline-operations", schoolId],
    queryFn: () => listOfflineOperations(),
    enabled: Boolean(schoolId),
  });
  const [entity, setEntity] = React.useState("attendance");
  const [entityId, setEntityId] = React.useState("");
  const queueMutation = useMutation({
    mutationFn: () =>
      recordOfflineOperation({
        data: {
          operationId: `${entity}-${entityId}-${Date.now()}`,
          entity,
          entityId,
          operation: "update",
          payload: { queuedFrom: "offline-workspace" },
          localVersion: new Date().toISOString(),
        },
      }),
    onSuccess: () => {
      setEntityId("");
      void queryClient.invalidateQueries({ queryKey: ["v5-offline-operations", schoolId] });
    },
  });
  const resolveMutation = useMutation({
    mutationFn: (id: string) =>
      resolveOfflineConflict({ data: { id, resolution: "manual_merge", mergedPayload: {} } }),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["v5-offline-operations", schoolId] }),
  });
  return (
    <div className="space-y-6">
      <header>
        <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
          <span className="size-1.5 rounded-full bg-primary" /> V5 OFFLINE DELIVERY
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight">Sync without silent overwrites</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Attendance, marks, basic records, and timetable operations can carry an operation ID,
          actor, timestamp, local version, sync status, retry state, and explicit conflict
          resolution.
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="metric-panel p-4">
          <Icons.WifiOff className="size-4 text-primary" />
          <p className="mt-3 text-xs text-muted-foreground">Current mode</p>
          <p className="mt-1 font-bold">{offline ? "Offline / low-data" : "Online"}</p>
        </div>
        <div className="metric-panel p-4">
          <Icons.RefreshCw className="size-4 text-primary" />
          <p className="mt-3 text-xs text-muted-foreground">Queued operations</p>
          <p className="mt-1 text-2xl font-extrabold">{operations.data?.length ?? 0}</p>
        </div>
        <div className="metric-panel p-4">
          <Icons.MicOff className="size-4 text-primary" />
          <p className="mt-3 text-xs text-muted-foreground">Voice input</p>
          <p className="mt-1 font-bold">Browser-dependent</p>
        </div>
      </div>
      <section className="surface-panel p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-primary-soft text-primary">
            <Icons.CloudOff className="size-4" />
          </span>
          <h2 className="font-bold">Queue a sync operation</h2>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[0.8fr_1fr_auto]">
          <select
            value={entity}
            onChange={(event) => setEntity(event.target.value)}
            className="h-10 rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="attendance">Attendance</option>
            <option value="marks">Marks</option>
            <option value="student_record">Basic student record</option>
            <option value="timetable">Timetable</option>
          </select>
          <input
            value={entityId}
            onChange={(event) => setEntityId(event.target.value)}
            placeholder="Entity ID"
            className="h-10 rounded-md border border-border bg-background px-3 text-sm"
          />
          <Button
            onClick={() => queueMutation.mutate()}
            disabled={queueMutation.isPending || entityId.trim().length < 1}
          >
            {queueMutation.isPending ? "Queueing…" : "Queue operation"}
          </Button>
        </div>
      </section>
      <section className="surface-panel p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Synchronization queue</h2>
          <p className="text-xs text-muted-foreground">
            Conflicts require an authorized resolution.
          </p>
        </div>
        <div className="mt-4 space-y-2">
          {(
            operations.data as
              | Array<{
                  id: string;
                  operation_id: string;
                  entity: string;
                  entity_id: string;
                  operation: string;
                  status: string;
                }>
              | undefined
          )?.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
            >
              <div>
                <p className="text-sm font-semibold">
                  {item.operation} · {item.entity}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.entity_id} · {item.operation_id}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{item.status}</Badge>
                {item.status === "CONFLICT" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => resolveMutation.mutate(item.id)}
                    disabled={resolveMutation.isPending}
                  >
                    Resolve manually
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
          {!operations.data?.length ? (
            <p className="text-sm text-muted-foreground">No queued operations yet.</p>
          ) : null}
        </div>
      </section>
      <p className="text-xs text-muted-foreground">
        If speech recognition is unavailable, the application must show an unsupported state; this
        workspace does not fake transcription. Low-data mode prioritizes core records and avoids
        loading large generated documents.
      </p>
    </div>
  );
}
