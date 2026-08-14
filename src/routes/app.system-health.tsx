import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { disableSchoolUser, getSystemHealthOverview, revokeSchoolSessions } from "@/actions/system";
import { useAppState } from "@/app/providers/app-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/app/system-health")({ component: SystemHealthPage });

function SystemHealthPage() {
  const { role, schoolId } = useAppState();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState("");
  const [reason, setReason] = useState("");
  const health = useQuery({
    queryKey: ["system-health", schoolId],
    queryFn: () => getSystemHealthOverview(),
    enabled: role === "owner" && Boolean(schoolId),
  });
  const revoke = useMutation({
    mutationFn: () => revokeSchoolSessions(),
    onSuccess: (result) => toast.success(`Revoked ${result.revoked} school sessions`),
    onError: (error: Error) => toast.error(error.message),
  });
  const disable = useMutation({
    mutationFn: () => disableSchoolUser({ data: { userId, reason } }),
    onSuccess: () => {
      setUserId("");
      setReason("");
      toast.success("User disabled and sessions revoked");
      void queryClient.invalidateQueries({ queryKey: ["system-health", schoolId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
  if (role !== "owner")
    return (
      <div className="surface-panel p-6 text-sm text-muted-foreground">
        System health and incident controls are restricted to the school owner.
      </div>
    );
  if (health.isLoading)
    return (
      <div className="surface-panel p-6 text-sm text-muted-foreground">Loading system health…</div>
    );
  if (health.isError || !health.data)
    return (
      <div className="surface-panel p-6 text-sm text-danger">
        System health could not be loaded. Check database readiness.
      </div>
    );
  return (
    <div className="space-y-6 pb-8">
      <header>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
          Platform operations
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight">System health</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Owner-only operational visibility for this school. Provider states are observed
          configuration states, not proof of live delivery.
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Status label="Application" value={health.data.application} />
        <Status label="Database" value={health.data.database} />
        <Status label="Email" value={health.data.email} />
        <Status label="Version" value={health.data.version} />
      </div>
      <section className="surface-panel space-y-4 p-5 sm:p-6">
        <h2 className="text-lg font-bold">Jobs and connectors</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {(health.data.jobs as Array<{ status: string; count: number }>).map((item) => (
            <div key={item.status} className="rounded-lg border border-border p-3 text-sm">
              <span className="font-semibold">{item.status}</span>
              <span className="ml-2 text-muted-foreground">{item.count}</span>
            </div>
          ))}
          {(
            health.data.providers as Array<{
              provider_type: string;
              configuration_status: string;
              enabled: boolean;
            }>
          ).map((item) => (
            <div key={item.provider_type} className="rounded-lg border border-border p-3 text-sm">
              <span className="font-semibold">{item.provider_type}</span>
              <Badge variant="secondary" className="ml-2">
                {item.enabled ? item.configuration_status : "disabled"}
              </Badge>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Queue workers, connector credentials, payment webhooks, private storage, and monitoring
          remain deployment verification requirements.
        </p>
      </section>
      <section className="surface-panel space-y-4 p-5 sm:p-6">
        <h2 className="text-lg font-bold">Incident containment</h2>
        <Button variant="destructive" onClick={() => revoke.mutate()} disabled={revoke.isPending}>
          {revoke.isPending ? "Revoking…" : "Revoke all school sessions"}
        </Button>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            placeholder="Target user ID"
          />
          <Input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Reason (at least 10 characters)"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => disable.mutate()}
          disabled={disable.isPending || userId.length < 1 || reason.trim().length < 10}
        >
          {disable.isPending ? "Disabling…" : "Disable user and revoke sessions"}
        </Button>
      </section>
      <section className="surface-panel space-y-4 p-5 sm:p-6">
        <h2 className="text-lg font-bold">Recent security events</h2>
        <div className="space-y-2">
          {(
            health.data.recentSecurityEvents as Array<{
              event_type: string;
              outcome: string;
              severity: string;
              created_at: string;
            }>
          )
            .slice(0, 20)
            .map((event, index) => (
              <div
                key={`${event.event_type}-${event.created_at}-${index}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded border border-border p-2 text-xs"
              >
                <span>
                  {event.event_type} · {event.outcome}
                </span>
                <span className="text-muted-foreground">
                  {event.severity} · {new Date(event.created_at).toLocaleString()}
                </span>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}

function Status({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
