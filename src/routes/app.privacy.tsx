import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listSchoolDataRequests,
  requestSchoolDeletion,
  reviewSchoolDataRequest,
} from "@/actions/data";
import { useAppState } from "@/app/providers/app-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/app/privacy")({ component: PrivacyPage });

function PrivacyPage() {
  const { role, schoolId } = useAppState();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const requests = useQuery({
    queryKey: ["school-data-requests", schoolId],
    queryFn: () => listSchoolDataRequests(),
    enabled: Boolean(schoolId) && ["owner", "principal", "admin"].includes(role),
  });
  const requestDeletion = useMutation({
    mutationFn: () => requestSchoolDeletion({ data: { reason, scope: { school: true } } }),
    onSuccess: () => {
      setReason("");
      toast.success("Deletion request submitted for owner-controlled review");
      void queryClient.invalidateQueries({ queryKey: ["school-data-requests", schoolId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const review = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: "approved" | "rejected" }) =>
      reviewSchoolDataRequest({ data: { id, decision } }),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["school-data-requests", schoolId] }),
    onError: (error: Error) => toast.error(error.message),
  });
  if (!["owner", "principal", "admin"].includes(role))
    return (
      <div className="surface-panel p-6 text-sm text-muted-foreground">
        Privacy controls are restricted to school leadership.
      </div>
    );
  return (
    <div className="space-y-6 pb-8">
      <header>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
          Privacy and data
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight">Data controls</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          School-scoped requests are permission-protected and audited. Deletion approval does not
          itself execute destructive deletion; execution requires a controlled deployment job,
          retention policy, legal hold check, re-authentication, and restore-tested backups.
        </p>
      </header>
      <section className="surface-panel space-y-4 p-5 sm:p-6">
        <div>
          <h2 className="text-lg font-bold">Request school deletion</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Use only for an approved offboarding or legal request. The system records the request;
            it does not silently delete data.
          </p>
        </div>
        <Textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Document the approved reason, scope, and retention/legal review (at least 20 characters)…"
        />
        <Button
          variant="destructive"
          onClick={() => requestDeletion.mutate()}
          disabled={requestDeletion.isPending || reason.trim().length < 20}
        >
          {requestDeletion.isPending ? "Submitting…" : "Submit deletion request"}
        </Button>
      </section>
      <section className="surface-panel space-y-4 p-5 sm:p-6">
        <div>
          <h2 className="text-lg font-bold">Requests</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Only the owner can approve destructive requests. Legal holds and execution are handled
            outside this synchronous UI boundary.
          </p>
        </div>
        <div className="space-y-3">
          {(requests.data ?? []).map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm"
            >
              <div>
                <p className="font-semibold">
                  {item.request_type} · {item.status}
                </p>
                <p className="text-xs text-muted-foreground">{item.reason}</p>
              </div>
              <div className="flex gap-2">
                {role === "owner" && item.status === "requested" ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => review.mutate({ id: item.id, decision: "rejected" })}
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => review.mutate({ id: item.id, decision: "approved" })}
                    >
                      Approve for controlled job
                    </Button>
                  </>
                ) : (
                  <Badge variant="secondary">Owner review required</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
