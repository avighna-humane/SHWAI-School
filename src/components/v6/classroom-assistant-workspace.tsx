import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import * as Icons from "lucide-react";
import { askV6ClassroomAssistant } from "@/actions/v6";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function V6ClassroomAssistantWorkspace() {
  const [subject, setSubject] = React.useState("");
  const [lesson, setLesson] = React.useState("");
  const [topic, setTopic] = React.useState("");
  const [question, setQuestion] = React.useState("");
  const mutation = useMutation({
    mutationFn: () => askV6ClassroomAssistant({ data: { subject, lesson, topic, question } }),
  });
  return (
    <div className="space-y-6">
      <header>
        <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-ai">
          <span className="size-1.5 rounded-full bg-ai" /> V6 CLASSROOM ASSISTANT
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight">Teach with approved context</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          The classroom assistant uses the current lesson and approved school knowledge where
          available. Suggestions are not authoritative student decisions and remain editable.
        </p>
      </header>
      <section className="surface-panel p-5 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="Subject"
            className="h-10 rounded-md border border-border bg-background px-3 text-sm"
          />
          <input
            value={lesson}
            onChange={(event) => setLesson(event.target.value)}
            placeholder="Current lesson"
            className="h-10 rounded-md border border-border bg-background px-3 text-sm"
          />
          <input
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="Curriculum topic"
            className="h-10 rounded-md border border-border bg-background px-3 text-sm"
          />
        </div>
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask for an example, activity, differentiation suggestion, or revision prompt…"
          className="mt-3 min-h-28 w-full rounded-md border border-border bg-background p-3 text-sm"
        />
        <Button
          className="mt-3"
          onClick={() => mutation.mutate()}
          disabled={
            mutation.isPending ||
            subject.trim().length < 1 ||
            lesson.trim().length < 1 ||
            topic.trim().length < 1 ||
            question.trim().length < 3
          }
        >
          {mutation.isPending ? "Preparing…" : "Ask classroom assistant"}
        </Button>
        {mutation.error ? (
          <p className="mt-3 text-sm text-danger">{(mutation.error as Error).message}</p>
        ) : null}
        {mutation.data ? (
          <div className="mt-4 rounded-xl border border-ai/20 bg-ai-soft/20 p-4">
            <div className="flex items-center justify-between gap-2">
              <Badge variant="outline">{mutation.data.status}</Badge>
              <Icons.ShieldCheck className="size-4 text-ai" />
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6">
              {mutation.data.answer ?? mutation.data.message}
            </p>
            {mutation.data.sources?.length ? (
              <div className="mt-4 border-t border-ai/20 pt-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ai">
                  Approved source context
                </p>
                {mutation.data.sources.map((source) => (
                  <p key={source.source_id} className="mt-1 text-xs text-muted-foreground">
                    [{source.source_id}] {source.title}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
      <p className="text-xs text-muted-foreground">
        If no approved source matches or the provider is unavailable, the workspace reports that
        state instead of fabricating an answer.
      </p>
    </div>
  );
}
