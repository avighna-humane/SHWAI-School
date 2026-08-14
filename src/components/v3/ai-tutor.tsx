import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Icons from "lucide-react";
import {
  askAiTutor,
  listAiTutorMessages,
  listAiTutorSessions,
  recordAiLearningActivity,
} from "@/actions/ai";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type TutorResult = {
  sessionId: string;
  response: string;
  hintLevel: number;
  nextStep: string;
  safetyNote: string | null;
  suggestedPractice: string[];
  aiGenerated: true;
  contextScope: "student_academic_only";
  requestId: string;
};

type TutorSession = {
  id: string;
  topic: string;
  subject: string;
  class_label: string | null;
  created_at: string | Date;
  updated_at: string | Date;
};
type TutorMessage = {
  id: string;
  role: "student" | "tutor" | "system";
  content: string;
  hint_level: number | null;
  created_at: string | Date;
};

function ErrorNotice({ error }: { error: unknown }) {
  if (!error) return null;
  const message = error instanceof Error ? error.message : String(error);
  const configurationRequired = /configuration|provider|BUILT_IN_FORGE/i.test(message);
  return (
    <div
      className={`rounded-xl border p-4 text-sm ${configurationRequired ? "border-warning/30 bg-warning/5 text-warning" : "border-danger/30 bg-danger/5 text-danger"}`}
    >
      <div className="flex items-start gap-2">
        {configurationRequired ? (
          <Icons.Settings2 className="mt-0.5 size-4 shrink-0" />
        ) : (
          <Icons.TriangleAlert className="mt-0.5 size-4 shrink-0" />
        )}
        <div>
          <p className="font-semibold">
            {configurationRequired
              ? "AI configuration required"
              : "Tutor request could not be completed"}
          </p>
          <p className="mt-1 leading-5">{message}</p>
        </div>
      </div>
    </div>
  );
}

export function AiTutor() {
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState("Mathematics");
  const [topic, setTopic] = useState("");
  const [question, setQuestion] = useState("");
  const [hintLevel, setHintLevel] = useState(0);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [result, setResult] = useState<TutorResult | null>(null);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [history, setHistory] = useState<TutorMessage[]>([]);

  const sessionsQuery = useQuery({
    queryKey: ["ai-tutor-sessions"],
    queryFn: () => listAiTutorSessions(),
  });
  const messagesQuery = useQuery({
    queryKey: ["ai-tutor-messages", expandedSession],
    queryFn: () => listAiTutorMessages({ data: { sessionId: expandedSession! } }),
    enabled: Boolean(expandedSession),
  });
  const tutorMutation = useMutation({
    mutationFn: () =>
      askAiTutor({
        data: {
          sessionId,
          subject,
          topic,
          question,
          hintLevel,
          requestFullExplanation: hintLevel >= 5,
        },
      }),
    onSuccess: (data) => {
      setResult(data as TutorResult);
      setSessionId(data.sessionId);
      setQuestion("");
      void queryClient.invalidateQueries({ queryKey: ["ai-tutor-sessions"] });
      void queryClient.invalidateQueries({ queryKey: ["ai-tutor-messages", data.sessionId] });
    },
  });
  const activityMutation = useMutation({
    mutationFn: (successful: boolean) =>
      recordAiLearningActivity({
        data: {
          topic,
          activityType: "question_answered",
          successful,
          hintsRequested: hintLevel,
          sourceId: sessionId,
        },
      }),
  });

  const sendQuestion = (event: React.FormEvent) => {
    event.preventDefault();
    if (!topic.trim() || !question.trim()) return;
    tutorMutation.mutate();
  };

  const openSession = async (id: string) => {
    setExpandedSession(id);
    setSessionId(id);
    const data = await listAiTutorMessages({ data: { sessionId: id } });
    setHistory(data as unknown as TutorMessage[]);
  };

  const shownHistory = expandedSession
    ? history.length
      ? history
      : ((messagesQuery.data as TutorMessage[] | undefined) ?? [])
    : [];

  return (
    <div className="space-y-6 pb-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-ai">
            <span className="size-1.5 rounded-full bg-ai" /> Student-safe learning support
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight">AI Tutor</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Ask for the next helpful step, not a shortcut. SHWAI keeps the conversation inside your
            academic context and moves through five progressive hint levels.
          </p>
        </div>
        <Badge className="rounded-full bg-ai-soft px-3 py-1 text-ai">
          <Icons.ShieldCheck className="mr-1.5 size-3.5" /> Private academic context only
        </Badge>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="surface-panel p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Socratic tutor
              </p>
              <h2 className="mt-1 text-xl font-bold">Work through the problem</h2>
            </div>
            <Badge variant="outline" className="rounded-full">
              Hint {hintLevel} / 5
            </Badge>
          </div>
          <form onSubmit={sendQuestion} className="mt-5 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Subject
                <input
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                />
              </label>
              <label className="block text-sm font-medium">
                Topic
                <input
                  required
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  placeholder="e.g. Linear equations"
                  className="mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                />
              </label>
            </div>
            <label className="block text-sm font-medium">
              Your question
              <textarea
                required
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                rows={5}
                maxLength={3000}
                placeholder="Show what you tried, or ask which step to take next…"
                className="mt-1.5 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            <div>
              <p className="text-sm font-medium">Choose the help level</p>
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {[0, 1, 2, 3, 4, 5].map((level) => (
                  <button
                    type="button"
                    key={level}
                    onClick={() => setHintLevel(level)}
                    className={`rounded-lg border px-2 py-2 text-xs font-semibold transition-colors ${hintLevel === level ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:bg-muted"}`}
                  >
                    {level === 0 ? "Start" : level === 5 ? "Explain" : `Hint ${level}`}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Levels 0–4 provide progressively clearer hints. Level 5 permits a full explanation
                after you have tried the steps.
              </p>
            </div>
            <Button
              type="submit"
              disabled={tutorMutation.isPending || !topic.trim() || !question.trim()}
              className="w-full"
            >
              <Icons.MessageCircle className="mr-2 size-4" />
              {tutorMutation.isPending ? "Thinking securely…" : "Ask for the next step"}
            </Button>
            <ErrorNotice error={tutorMutation.error} />
          </form>

          {result ? (
            <div className="mt-6 space-y-4 border-t border-border pt-5">
              <div className="rounded-lg border border-ai/20 bg-ai-soft/30 p-3 text-xs text-ai">
                <Icons.Sparkles className="mr-1.5 inline size-3.5" /> AI-generated guidance · Hint
                level {result.hintLevel} · Request {result.requestId}
              </div>
              <div className="rounded-xl bg-muted/35 p-4">
                <p className="whitespace-pre-wrap text-sm leading-7">{result.response}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Next step
                  </p>
                  <p className="mt-2 text-sm leading-6">{result.nextStep}</p>
                </div>
                {result.safetyNote ? (
                  <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-warning">
                      Safety note
                    </p>
                    <p className="mt-2 text-sm leading-6 text-warning">{result.safetyNote}</p>
                  </div>
                ) : null}
              </div>
              {result.suggestedPractice.length ? (
                <div>
                  <p className="text-sm font-semibold">Try these related questions</p>
                  <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                    {result.suggestedPractice.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="text-primary">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">Was this step useful?</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => activityMutation.mutate(true)}
                >
                  <Icons.ThumbsUp className="mr-1.5 size-3.5" /> Yes
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => activityMutation.mutate(false)}
                >
                  <Icons.ThumbsDown className="mr-1.5 size-3.5" /> Not yet
                </Button>
              </div>
            </div>
          ) : null}
        </section>

        <aside className="space-y-6">
          <section className="surface-panel p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Session history
                </p>
                <h2 className="mt-1 text-xl font-bold">Continue learning</h2>
              </div>
              <Badge variant="outline" className="rounded-full">
                {sessionsQuery.data?.length ?? 0}
              </Badge>
            </div>
            {sessionsQuery.isLoading ? (
              <p className="mt-4 text-sm text-muted-foreground">Loading sessions…</p>
            ) : sessionsQuery.isError ? (
              <ErrorNotice error={sessionsQuery.error} />
            ) : (
              <div className="mt-4 divide-y divide-border">
                {(sessionsQuery.data as TutorSession[] | undefined)?.map((session) => (
                  <button
                    type="button"
                    key={session.id}
                    onClick={() => void openSession(session.id)}
                    className={`flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-muted/30 ${session.id === sessionId ? "text-primary" : ""}`}
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                      <Icons.History className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{session.topic}</span>
                      <span className="block text-xs text-muted-foreground">
                        {session.subject} · {new Date(session.updated_at).toLocaleDateString()}
                      </span>
                    </span>
                    <Icons.ChevronRight className="size-4 text-muted-foreground" />
                  </button>
                ))}
                {!sessionsQuery.data?.length ? (
                  <p className="py-4 text-sm text-muted-foreground">
                    Your completed tutor sessions will appear here.
                  </p>
                ) : null}
              </div>
            )}
          </section>
          {expandedSession ? (
            <section className="surface-panel p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold">Session messages</h2>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setExpandedSession(null)}
                >
                  Close
                </Button>
              </div>
              <div className="mt-4 max-h-96 space-y-3 overflow-y-auto">
                {shownHistory.map((message) => (
                  <div
                    key={message.id}
                    className={`rounded-lg p-3 text-sm ${message.role === "student" ? "ml-5 bg-primary/5" : "mr-5 bg-muted/40"}`}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      {message.role}{" "}
                      {message.hint_level !== null ? `· hint ${message.hint_level}` : ""}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap leading-6">{message.content}</p>
                  </div>
                ))}
                {!shownHistory.length ? (
                  <p className="text-sm text-muted-foreground">
                    No messages found for this session.
                  </p>
                ) : null}
              </div>
            </section>
          ) : (
            <section className="surface-panel bg-ai-soft/25 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-ai text-ai-foreground">
                  <Icons.Lightbulb className="size-4" />
                </span>
                <div>
                  <h2 className="font-bold">A safer way to learn</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    SHWAI minimizes the context sent to the provider, records learning activity
                    without exposing private conversations to parents, and never treats generated
                    guidance as a grade.
                  </p>
                </div>
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
