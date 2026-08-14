import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Icons from "lucide-react";
import {
  askKnowledgeAssistant,
  listKnowledgeSources,
  registerKnowledgeSource,
  reviewKnowledgeSource,
} from "@/actions/v6";
import { useAppState } from "@/app/providers/app-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function V6KnowledgeWorkspace() {
  const { schoolId, role } = useAppState();
  const queryClient = useQueryClient();
  const canManage = ["admin", "principal", "owner"].includes(role);
  const sources = useQuery({
    queryKey: ["v6-knowledge-sources", schoolId],
    queryFn: () => listKnowledgeSources(),
  });
  const [query, setQuery] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [sourceType, setSourceType] = React.useState("school_policy");
  const answerMutation = useMutation({
    mutationFn: () => askKnowledgeAssistant({ data: { query } }),
  });
  const registerMutation = useMutation({
    mutationFn: () =>
      registerKnowledgeSource({
        data: {
          title,
          sourceType,
          documentId: null,
          version: "1",
          metadata: { registeredFrom: "v6-knowledge-workspace" },
        },
      }),
    onSuccess: () => {
      setTitle("");
      void queryClient.invalidateQueries({ queryKey: ["v6-knowledge-sources", schoolId] });
    },
  });
  const reviewMutation = useMutation({
    mutationFn: (data: { sourceId: string; approvalState: "approved" | "rejected" | "archived" }) =>
      reviewKnowledgeSource({ data }),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["v6-knowledge-sources", schoolId] }),
  });
  return (
    <div className="space-y-6">
      <header>
        <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-ai">
          <span className="size-1.5 rounded-full bg-ai" /> V6 SCHOOL KNOWLEDGE
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight">Ask the approved school record</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Answers are limited to approved, school-scoped source chunks. When no approved source
          matches, SHWAI says so instead of inventing a policy.
        </p>
      </header>
      <section className="surface-panel p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-ai-soft text-ai">
            <Icons.BookOpenCheck className="size-4" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Source-backed Q&A
            </p>
            <h2 className="mt-1 text-xl font-bold">
              Search policies, circulars, and approved curriculum
            </h2>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="What is the school's late-arrival policy?"
            className="h-11 flex-1 rounded-md border border-border bg-background px-3 text-sm"
          />
          <Button
            onClick={() => answerMutation.mutate()}
            disabled={answerMutation.isPending || query.trim().length < 3}
          >
            {answerMutation.isPending ? "Searching…" : "Ask approved sources"}
          </Button>
        </div>
        {answerMutation.error ? (
          <p className="mt-3 text-sm text-danger">{(answerMutation.error as Error).message}</p>
        ) : null}
        {answerMutation.data ? (
          <div className="mt-4 rounded-xl border border-ai/20 bg-ai-soft/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge variant="outline">{answerMutation.data.status}</Badge>
              <span className="text-xs text-muted-foreground">
                Query {answerMutation.data.queryId}
              </span>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6">
              {answerMutation.data.answer ?? answerMutation.data.message}
            </p>
            {answerMutation.data.sources?.length ? (
              <div className="mt-4 border-t border-ai/20 pt-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ai">Sources</p>
                <div className="mt-2 space-y-1">
                  {answerMutation.data.sources.map((source) => (
                    <p
                      key={source.source_id ?? source.chunk_id}
                      className="text-xs text-muted-foreground"
                    >
                      [{source.source_id ?? source.chunk_id}] {source.title}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
      {canManage ? (
        <section className="surface-panel p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Knowledge governance
              </p>
              <h2 className="mt-1 font-bold">Register a source for human review</h2>
            </div>
            <Badge variant="outline">PENDING REVIEW BY DEFAULT</Badge>
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Source title"
              className="h-10 flex-1 rounded-md border border-border bg-background px-3 text-sm"
            />
            <select
              value={sourceType}
              onChange={(event) => setSourceType(event.target.value)}
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="school_policy">School policy</option>
              <option value="circular">Circular</option>
              <option value="curriculum">Curriculum</option>
              <option value="staff_handbook">Staff handbook</option>
              <option value="regulation">Regulation</option>
            </select>
            <Button
              onClick={() => registerMutation.mutate()}
              disabled={registerMutation.isPending || title.trim().length < 2}
            >
              Register source
            </Button>
          </div>
        </section>
      ) : null}
      <section className="surface-panel p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Approved-source register</h2>
          <Badge variant="outline">{sources.data?.length ?? 0} records</Badge>
        </div>
        <div className="mt-4 space-y-2">
          {(
            sources.data as
              | Array<{
                  id: string;
                  title: string;
                  source_type: string;
                  approval_state: string;
                  chunk_count: number;
                }>
              | undefined
          )?.map((source) => (
            <div
              key={source.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
            >
              <div>
                <p className="text-sm font-semibold">{source.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {source.source_type} · {source.chunk_count} indexed chunks
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{source.approval_state}</Badge>
                {canManage && source.approval_state === "pending_review" ? (
                  <>
                    <Button
                      size="sm"
                      onClick={() =>
                        reviewMutation.mutate({ sourceId: source.id, approvalState: "approved" })
                      }
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        reviewMutation.mutate({ sourceId: source.id, approvalState: "rejected" })
                      }
                    >
                      Reject
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          ))}
          {!sources.data?.length ? (
            <p className="text-sm text-muted-foreground">
              No school knowledge sources are registered. The assistant will not claim policies
              exist.
            </p>
          ) : null}
        </div>
      </section>
      <p className="text-xs text-muted-foreground">
        LIVE/PERSISTED state is shown by source records and citations. Provider-dependent answers
        show CONFIGURATION REQUIRED instead of fabricated output.
      </p>
    </div>
  );
}
