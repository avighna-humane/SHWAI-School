import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Icons from "lucide-react";
import {
  createHelpRequest,
  listHelpRequests,
  listStudentContext,
  requestContextCorrection,
} from "@/actions/decision";
import { useAppState } from "@/app/providers/app-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function SupportWorkspace() {
  const { schoolId, role } = useAppState();
  const queryClient = useQueryClient();
  const context = useQuery({
    queryKey: ["v5-context", schoolId],
    queryFn: () => listStudentContext(),
    enabled: Boolean(schoolId),
  });
  const requests = useQuery({
    queryKey: ["v5-help-requests", schoolId],
    queryFn: () => listHelpRequests(),
    enabled: Boolean(schoolId),
  });
  const [subject, setSubject] = React.useState("");
  const [topic, setTopic] = React.useState("");
  const [language, setLanguage] = React.useState("");
  const helpMutation = useMutation({
    mutationFn: () => createHelpRequest({ data: { subject, topic, language } }),
    onSuccess: () => {
      setSubject("");
      setTopic("");
      void queryClient.invalidateQueries({ queryKey: ["v5-help-requests", schoolId] });
    },
  });
  const correctionMutation = useMutation({
    mutationFn: (contextId: string) =>
      requestContextCorrection({
        data: { contextId, reason: "Please review this support context record." },
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["v5-context", schoolId] }),
  });
  return (
    <div className="space-y-6">
      <header>
        <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
          <span className="size-1.5 rounded-full bg-primary" /> V5 STUDENT SUPPORT INFRASTRUCTURE
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight">
          Support with minimum necessary context
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Support requests use topic, subject, language, availability, and safety rules. Context
          records are human-provided, consent-aware, expiring, and never inferred from grades,
          attendance, behavior, or AI conversations.
        </p>
      </header>
      <section className="surface-panel p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-ai-soft text-ai">
            <Icons.HandHelping className="size-4" />
          </span>
          <h2 className="font-bold">Request learning support</h2>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="Subject"
            className="h-10 rounded-md border border-border bg-background px-3 text-sm"
          />
          <input
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="Topic or skill"
            className="h-10 rounded-md border border-border bg-background px-3 text-sm"
          />
          <input
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            placeholder="Preferred language (optional)"
            className="h-10 rounded-md border border-border bg-background px-3 text-sm"
          />
        </div>
        <Button
          className="mt-3"
          onClick={() => helpMutation.mutate()}
          disabled={helpMutation.isPending || subject.trim().length < 1 || topic.trim().length < 1}
        >
          {helpMutation.isPending ? "Submitting…" : "Submit support request"}
        </Button>
        {helpMutation.isError ? (
          <p className="mt-2 text-sm text-danger">{(helpMutation.error as Error).message}</p>
        ) : null}
      </section>
      <section className="grid gap-5 lg:grid-cols-2">
        <div className="surface-panel p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Help requests
          </p>
          <div className="mt-4 space-y-2">
            {(
              requests.data as
                | Array<{
                    id: string;
                    subject: string;
                    topic: string;
                    language: string;
                    status: string;
                  }>
                | undefined
            )
              ?.slice(0, 12)
              .map((item) => (
                <div key={item.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">
                      {item.subject} · {item.topic}
                    </p>
                    <Badge variant="outline">{item.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.language || "No language preference recorded"}
                  </p>
                </div>
              ))}
            {!requests.data?.length ? (
              <p className="text-sm text-muted-foreground">No help requests yet.</p>
            ) : null}
          </div>
        </div>
        <div className="surface-panel p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Context passport
          </p>
          <p className="mt-2 text-sm leading-5 text-muted-foreground">
            Only authorized users see the minimum necessary fields. Expired records are hidden from
            normal views.
          </p>
          <div className="mt-4 space-y-2">
            {(
              context.data as
                | Array<{
                    id: string;
                    category: string;
                    value?: string;
                    source: string;
                    expires_at: string | null;
                    visibility?: string;
                  }>
                | undefined
            )
              ?.slice(0, 12)
              .map((item) => (
                <div key={item.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{item.category}</p>
                    <Badge variant="outline">{item.visibility ?? "student support"}</Badge>
                  </div>
                  {role !== "student" ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Source: {item.source} · expires {item.expires_at ?? "not set"}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">{item.value}</p>
                  )}
                  {role !== "student" ? (
                    <Button
                      className="mt-2"
                      size="sm"
                      variant="ghost"
                      onClick={() => correctionMutation.mutate(item.id)}
                      disabled={correctionMutation.isPending}
                    >
                      Request correction
                    </Button>
                  ) : null}
                </div>
              ))}
            {!context.data?.length ? (
              <p className="text-sm text-muted-foreground">No active support context is visible.</p>
            ) : null}
          </div>
        </div>
      </section>
      <p className="text-xs text-muted-foreground">
        Peer tutoring and external resources require approved providers, human oversight, age/safety
        constraints, and private-data isolation. No public student rankings are used.
      </p>
    </div>
  );
}
