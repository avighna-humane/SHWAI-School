import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as Icons from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  addAssessmentQuestion,
  listAssessmentQuestions,
  startAssessmentAttempt,
  submitAssessmentAttempt,
  type AssessmentQuestionRow,
  type AssessmentRow,
} from "@/actions/academic";

export function AssessmentQuestionPanel({
  assessment,
  role,
}: {
  assessment: AssessmentRow;
  role: string;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    questionType: "mcq",
    prompt: "",
    options: "",
    correctAnswer: "",
    marks: "1",
    answerKey: "",
  });
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const questions = useQuery({
    queryKey: ["assessment-questions", assessment.id],
    queryFn: () => listAssessmentQuestions({ data: { assessmentId: assessment.id } }),
    enabled: open && typeof window !== "undefined",
  });
  const add = useMutation({
    mutationFn: () =>
      addAssessmentQuestion({
        data: {
          assessmentId: assessment.id,
          questionType: form.questionType as "mcq" | "subjective",
          prompt: form.prompt,
          options: form.options
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
          correctAnswer: form.correctAnswer || undefined,
          marks: Number(form.marks),
          answerKey: form.answerKey || undefined,
          sortOrder: questions.data?.length ?? 0,
        },
      }),
    onSuccess: () => {
      toast.success("Question saved");
      setForm({
        questionType: "mcq",
        prompt: "",
        options: "",
        correctAnswer: "",
        marks: "1",
        answerKey: "",
      });
      void questions.refetch();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const start = useMutation({
    mutationFn: () => startAssessmentAttempt({ data: { assessmentId: assessment.id } }),
    onSuccess: (attempt) => {
      setAttemptId(attempt.id);
      toast.success("Assessment started");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const submit = useMutation({
    mutationFn: () =>
      submitAssessmentAttempt({
        data: {
          attemptId: attemptId!,
          answers: Object.entries(responses).map(([questionId, response]) => ({
            questionId,
            response,
          })),
        },
      }),
    onSuccess: () => {
      toast.success("Assessment submitted");
      setAttemptId(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });
  return (
    <div className="border-t bg-muted/20 p-4">
      <Button size="sm" variant="ghost" onClick={() => setOpen((value) => !value)}>
        <Icons.ListChecks className="mr-2 size-4" />
        {open ? "Hide questions" : "Open questions / attempt"}
      </Button>
      {open ? (
        <div className="mt-3 space-y-3">
          {questions.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading questions…</p>
          ) : questions.isError ? (
            <p className="text-sm text-danger">{(questions.error as Error).message}</p>
          ) : !questions.data?.length ? (
            <p className="text-sm text-muted-foreground">
              No questions yet. A teacher can add manual MCQ or subjective questions while the
              assessment is a draft.
            </p>
          ) : (
            questions.data.map((question) => (
              <QuestionRow
                key={question.id}
                question={question}
                role={role}
                response={responses[question.id] ?? ""}
                onResponse={(response) =>
                  setResponses((current) => ({ ...current, [question.id]: response }))
                }
              />
            ))
          )}
          {["teacher", "principal", "admin", "owner"].includes(role) &&
          assessment.status === "draft" ? (
            <div className="rounded-lg border bg-background p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <select
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                  value={form.questionType}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, questionType: event.target.value }))
                  }
                >
                  <option value="mcq">MCQ</option>
                  <option value="subjective">Subjective</option>
                </select>
                <Input
                  type="number"
                  min="1"
                  placeholder="Marks"
                  value={form.marks}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, marks: event.target.value }))
                  }
                />
                <Textarea
                  className="sm:col-span-2"
                  placeholder="Question prompt"
                  value={form.prompt}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, prompt: event.target.value }))
                  }
                />
                {form.questionType === "mcq" ? (
                  <>
                    <Input
                      placeholder="Options, comma separated"
                      value={form.options}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, options: event.target.value }))
                      }
                    />
                    <Input
                      placeholder="Correct answer"
                      value={form.correctAnswer}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, correctAnswer: event.target.value }))
                      }
                    />
                  </>
                ) : (
                  <Input
                    placeholder="Optional rubric / answer key"
                    value={form.answerKey}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, answerKey: event.target.value }))
                    }
                  />
                )}
              </div>
              <Button
                className="mt-3"
                disabled={add.isPending || !form.prompt.trim()}
                onClick={() => add.mutate()}
              >
                {add.isPending ? "Saving…" : "Add question"}
              </Button>
            </div>
          ) : null}
          {role === "student" && assessment.status === "published" ? (
            <div className="flex flex-wrap gap-2">
              {attemptId ? (
                <Button disabled={submit.isPending} onClick={() => submit.mutate()}>
                  {submit.isPending ? "Submitting…" : "Submit assessment"}
                </Button>
              ) : (
                <Button disabled={start.isPending} onClick={() => start.mutate()}>
                  {start.isPending ? "Starting…" : "Start timed assessment"}
                </Button>
              )}
              <Badge variant="outline">
                Server enforces{" "}
                {assessment.duration_minutes
                  ? `${assessment.duration_minutes} minutes`
                  : "no time limit"}
              </Badge>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function QuestionRow({
  question,
  role,
  response,
  onResponse,
}: {
  question: AssessmentQuestionRow;
  role: string;
  response: string;
  onResponse: (response: string) => void;
}) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="flex items-start gap-2">
        <span className="text-xs font-semibold text-primary">
          {question.question_type.toUpperCase()}
        </span>
        <p className="flex-1 text-sm font-medium">{question.prompt}</p>
        <Badge variant="outline">{question.marks} marks</Badge>
      </div>
      {role === "student" ? (
        question.question_type === "mcq" ? (
          <select
            className="mt-3 h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={response}
            onChange={(event) => onResponse(event.target.value)}
          >
            <option value="">Select an answer</option>
            {question.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : (
          <Textarea
            className="mt-3"
            placeholder="Your answer"
            value={response}
            onChange={(event) => onResponse(event.target.value)}
          />
        )
      ) : null}
    </div>
  );
}
