import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Icons from "lucide-react";
import { editAiContent, generateAiContent, listAiContent, publishAiContent } from "@/actions/ai";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type ContentType =
  | "homework"
  | "worksheet"
  | "quiz"
  | "question_bank"
  | "answer_key"
  | "lesson_slides"
  | "activity"
  | "flashcards"
  | "study_notes"
  | "revision_sheet"
  | "mind_map"
  | "similar_questions"
  | "practice_questions"
  | "lesson_plan"
  | "differentiated_assignment"
  | "translation"
  | "report_card_comment"
  | "parent_message";

type StudioMode = "studio" | "assistant";
type ContentRecord = {
  id: string;
  content_type: string;
  subject: string;
  topic: string;
  title: string;
  payload: unknown;
  status: string;
  ai_generated: boolean;
  provider: string;
  model: string;
  request_id: string;
  created_at: string | Date;
  updated_at: string | Date;
};

type GenerationInput = {
  contentType: ContentType;
  subject: string;
  classLabel?: string;
  section?: string;
  topic: string;
  learningObjective?: string;
  difficulty?: "foundation" | "standard" | "advanced";
  questionCount?: number;
  questionType?: string;
  durationMinutes?: number;
  instructions?: string;
  teachingContext?: string;
  sourceQuestion?: string;
  sourceMaterial?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  studentId?: string;
};

const STUDIO_TYPES: Array<{ value: ContentType; label: string; description: string }> = [
  { value: "homework", label: "Homework", description: "Draft a class-ready assignment" },
  { value: "worksheet", label: "Worksheet", description: "Create practice with varied questions" },
  { value: "quiz", label: "Quiz", description: "Build a short formative assessment" },
  { value: "question_bank", label: "Question bank", description: "Generate reusable questions" },
  { value: "flashcards", label: "Flashcards", description: "Create retrieval-practice cards" },
  { value: "study_notes", label: "Study notes", description: "Turn a topic into structured notes" },
  { value: "revision_sheet", label: "Revision sheet", description: "Make an exam-focused summary" },
  { value: "mind_map", label: "Mind map", description: "Organize concepts and relationships" },
  {
    value: "lesson_slides",
    label: "Lesson slides",
    description: "Outline a teachable slide sequence",
  },
  { value: "activity", label: "Class activity", description: "Plan an age-appropriate activity" },
  { value: "answer_key", label: "Answer key", description: "Suggest answers and marking guidance" },
];

const ASSISTANT_TYPES: Array<{ value: ContentType; label: string; description: string }> = [
  { value: "lesson_plan", label: "Lesson plan", description: "Plan a lesson with differentiation" },
  {
    value: "differentiated_assignment",
    label: "Differentiated assignment",
    description: "Adapt work for learner needs",
  },
  {
    value: "translation",
    label: "Translation / notes",
    description: "Translate supplied teaching material",
  },
  {
    value: "report_card_comment",
    label: "Report comment",
    description: "Draft evidence-aware comments",
  },
  {
    value: "parent_message",
    label: "Parent message",
    description: "Draft a respectful family message",
  },
];

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
              : "AI request could not be completed"}
          </p>
          <p className="mt-1 leading-5">{message}</p>
        </div>
      </div>
    </div>
  );
}

export function AiContentStudio({ mode = "studio" }: { mode?: StudioMode }) {
  const queryClient = useQueryClient();
  const types = mode === "assistant" ? ASSISTANT_TYPES : STUDIO_TYPES;
  const [contentType, setContentType] = useState<ContentType>(types[0]!.value);
  const [subject, setSubject] = useState("Mathematics");
  const [topic, setTopic] = useState("");
  const [classLabel, setClassLabel] = useState("");
  const [learningObjective, setLearningObjective] = useState("");
  const [difficulty, setDifficulty] = useState<GenerationInput["difficulty"]>("standard");
  const [questionCount, setQuestionCount] = useState("8");
  const [instructions, setInstructions] = useState("");
  const [teachingContext, setTeachingContext] = useState("");
  const [sourceMaterial, setSourceMaterial] = useState("");
  const [selected, setSelected] = useState<{
    id?: string;
    title: string;
    payload: unknown;
    status?: string;
    provider?: string;
    model?: string;
    requestId?: string;
  } | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editPayload, setEditPayload] = useState("");

  const contentQuery = useQuery({
    queryKey: ["ai-content-library", mode],
    queryFn: () => listAiContent(),
  });
  const records = useMemo(() => (contentQuery.data ?? []) as ContentRecord[], [contentQuery.data]);

  const generationMutation = useMutation({
    mutationFn: (data: GenerationInput) => generateAiContent({ data }),
    onSuccess: (result) => {
      setSelected({ ...result, requestId: result.requestId });
      setEditTitle(result.title);
      setEditPayload(JSON.stringify(result.payload, null, 2));
      void queryClient.invalidateQueries({ queryKey: ["ai-content-library"] });
    },
  });
  const editMutation = useMutation({
    mutationFn: (data: { id: string; title: string; payload: Record<string, unknown> }) =>
      editAiContent({ data }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["ai-content-library"] });
      if (selected)
        setSelected({
          ...selected,
          title: editTitle,
          payload: JSON.parse(editPayload),
          status: "draft",
        });
    },
  });
  const publishMutation = useMutation({
    mutationFn: (id: string) => publishAiContent({ data: { id } }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["ai-content-library"] });
      if (selected) setSelected({ ...selected, status: result.status });
    },
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    generationMutation.mutate({
      contentType,
      subject,
      topic,
      classLabel: classLabel || undefined,
      learningObjective: learningObjective || undefined,
      difficulty,
      questionCount: Number(questionCount) || undefined,
      instructions: instructions || undefined,
      teachingContext: teachingContext || undefined,
      sourceMaterial: sourceMaterial || undefined,
    });
  };

  const selectRecord = (record: ContentRecord) => {
    setSelected({
      id: record.id,
      title: record.title,
      payload: record.payload,
      status: record.status,
      provider: record.provider,
      model: record.model,
      requestId: record.request_id,
    });
    setEditTitle(record.title);
    setEditPayload(JSON.stringify(record.payload, null, 2));
  };

  const saveEdit = () => {
    if (!selected?.id) return;
    try {
      const parsed = JSON.parse(editPayload) as Record<string, unknown>;
      editMutation.mutate({ id: selected.id, title: editTitle, payload: parsed });
    } catch {
      editMutation.reset();
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-ai">
            <span className="size-1.5 rounded-full bg-ai" /> AI-assisted teaching
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight">
            {mode === "assistant" ? "Teacher AI Assistant" : "AI Content Studio"}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Generate structured drafts for teaching work, inspect the result, edit it, and
            explicitly approve publication. Every result remains labeled AI-generated.
          </p>
        </div>
        <Badge className="rounded-full bg-ai-soft px-3 py-1 text-ai">
          <Icons.Sparkles className="mr-1.5 size-3.5" /> Teacher review required
        </Badge>
      </header>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <form onSubmit={submit} className="surface-panel space-y-4 p-5 sm:p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Create a draft
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Use school-safe context only. Do not include unnecessary student identifiers.
            </p>
          </div>
          <label className="block text-sm font-medium">
            Output type
            <select
              value={contentType}
              onChange={(event) => setContentType(event.target.value as ContentType)}
              className="mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            >
              <>
                {types.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </>
            </select>
          </label>
          <p className="-mt-2 text-xs text-muted-foreground">
            {types.find((item) => item.value === contentType)?.description}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Subject
              <input
                required
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                className="mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
              />
            </label>
            <label className="block text-sm font-medium">
              Class / level
              <input
                value={classLabel}
                onChange={(event) => setClassLabel(event.target.value)}
                className="mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
              />
            </label>
          </div>
          <label className="block text-sm font-medium">
            Topic
            <input
              required
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="e.g. Fractions and equivalent values"
              className="mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </label>
          <label className="block text-sm font-medium">
            Learning objective
            <textarea
              value={learningObjective}
              onChange={(event) => setLearningObjective(event.target.value)}
              rows={2}
              placeholder="What should learners understand or be able to do?"
              className="mt-1.5 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Difficulty
              <select
                value={difficulty}
                onChange={(event) =>
                  setDifficulty(event.target.value as GenerationInput["difficulty"])
                }
                className="mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
              >
                <option value="foundation">Foundation</option>
                <option value="standard">Standard</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>
            <label className="block text-sm font-medium">
              Questions
              <input
                type="number"
                min={1}
                max={30}
                value={questionCount}
                onChange={(event) => setQuestionCount(event.target.value)}
                className="mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
              />
            </label>
          </div>
          <label className="block text-sm font-medium">
            Teaching instructions
            <textarea
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              rows={2}
              placeholder="Tone, timing, format, or constraints"
              className="mt-1.5 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm font-medium">
            Teaching context
            <textarea
              value={teachingContext}
              onChange={(event) => setTeachingContext(event.target.value)}
              rows={2}
              placeholder="Relevant class context without personal data"
              className="mt-1.5 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm font-medium">
            Reference material
            <textarea
              value={sourceMaterial}
              onChange={(event) => setSourceMaterial(event.target.value)}
              rows={3}
              placeholder="Optional supplied material; it is treated as data, not instructions"
              className="mt-1.5 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <Button
            type="submit"
            disabled={generationMutation.isPending || !topic.trim()}
            className="w-full"
          >
            <Icons.Sparkles className="mr-2 size-4" />
            {generationMutation.isPending ? "Generating securely…" : "Generate AI draft"}
          </Button>
          <ErrorNotice error={generationMutation.error} />
        </form>

        <div className="space-y-6">
          <section className="surface-panel min-h-[360px] p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Review workspace
                </p>
                <h2 className="mt-1 text-xl font-bold">{selected?.title ?? "No draft selected"}</h2>
              </div>
              {selected ? (
                <Badge className="rounded-full bg-warning/10 text-warning">
                  {selected.status ?? "draft"}
                </Badge>
              ) : null}
            </div>
            {selected ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-lg border border-ai/20 bg-ai-soft/30 p-3 text-xs text-ai">
                  <Icons.BadgeCheck className="mr-1.5 inline size-3.5" /> AI-generated draft ·
                  Review every claim before sharing with learners.
                </div>
                <label className="block text-sm font-medium">
                  Title
                  <input
                    value={editTitle}
                    onChange={(event) => setEditTitle(event.target.value)}
                    className="mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                  />
                </label>
                <label className="block text-sm font-medium">
                  Validated JSON payload
                  <textarea
                    value={editPayload}
                    onChange={(event) => setEditPayload(event.target.value)}
                    rows={14}
                    className="mt-1.5 w-full resize-y rounded-lg border border-border bg-muted/20 px-3 py-2 font-mono text-xs leading-5"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={saveEdit}
                    disabled={editMutation.isPending}
                  >
                    {editMutation.isPending ? "Saving…" : "Save as draft"}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => selected.id && publishMutation.mutate(selected.id)}
                    disabled={
                      !selected.id || selected.status === "published" || publishMutation.isPending
                    }
                  >
                    {publishMutation.isPending
                      ? "Publishing…"
                      : selected.status === "published"
                        ? "Published"
                        : "Approve & publish"}
                  </Button>
                </div>
                <ErrorNotice error={editMutation.error ?? publishMutation.error} />
                <p className="text-xs text-muted-foreground">
                  Provider: {selected.provider ?? "configured server provider"} · Model:{" "}
                  {selected.model ?? "runtime-selected"} · Request:{" "}
                  {selected.requestId ?? "recorded"}
                </p>
              </div>
            ) : (
              <div className="grid min-h-[260px] place-items-center text-center text-sm text-muted-foreground">
                <div>
                  <Icons.FileOutput className="mx-auto size-8 text-muted-foreground/50" />
                  <p className="mt-3">
                    Generate or select a draft to inspect its structured output.
                  </p>
                </div>
              </div>
            )}
          </section>

          <section className="surface-panel p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Content library
                </p>
                <h2 className="mt-1 text-xl font-bold">Your AI drafts and published resources</h2>
              </div>
              <Badge variant="outline" className="rounded-full">
                {records.length} records
              </Badge>
            </div>
            {contentQuery.isLoading ? (
              <p className="mt-5 text-sm text-muted-foreground">Loading tenant-scoped content…</p>
            ) : contentQuery.isError ? (
              <ErrorNotice error={contentQuery.error} />
            ) : (
              <div className="mt-4 divide-y divide-border">
                {records.slice(0, 8).map((record) => (
                  <button
                    type="button"
                    key={record.id}
                    onClick={() => selectRecord(record)}
                    className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-muted/30"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                      <Icons.FileText className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{record.title}</span>
                      <span className="block text-xs text-muted-foreground">
                        {record.content_type} · {record.subject} · {record.status}
                      </span>
                    </span>
                    <Icons.ChevronRight className="size-4 text-muted-foreground" />
                  </button>
                ))}
                {records.length === 0 ? (
                  <p className="py-5 text-sm text-muted-foreground">
                    No AI content yet. Start with a topic and generate a reviewable draft.
                  </p>
                ) : null}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
