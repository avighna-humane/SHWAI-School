import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Icons from "lucide-react";
import { toast } from "sonner";
import { useAppState } from "@/app/providers/app-state";
import { AssessmentQuestionPanel } from "@/components/v2/assessment-question-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  listAssessments,
  listAssessmentQuestions,
  addAssessmentQuestion,
  startAssessmentAttempt,
  submitAssessmentAttempt,
  createAssessment,
  updateAssessmentStatus,
  listGrades,
  upsertGrade,
  listReportCards,
  publishReportCard,
  listTimetable,
  getAcademicAnalytics,
  listSubstituteAssignments,
  createSubstituteAssignment,
  type AssessmentRow,
  type AssessmentQuestionRow,
} from "@/actions/academic";

type AssessmentFormState = {
  title: string;
  subject: string;
  classId: string;
  assessmentType: string;
  maximumMarks: string;
  assessmentDate: string;
  durationMinutes: string;
  instructions: string;
};
type GradeFormState = {
  studentId: string;
  academicYearId: string;
  assessmentId: string;
  homeworkId: string;
  subject: string;
  maximumMarks: string;
  obtainedMarks: string;
  feedback: string;
};
type AnalyticsData = {
  observed: boolean;
  homework: { total: number; completed: number };
  performance: Array<Record<string, unknown>>;
  attendance: Array<Record<string, unknown>>;
};

export function AcademicWorkspace({ pathname, title }: { pathname: string; title: string }) {
  const { schoolId, year, role } = useAppState();
  const queryClient = useQueryClient();
  const [assessmentForm, setAssessmentForm] = useState({
    title: "",
    subject: "",
    classId: "",
    assessmentType: "quiz",
    maximumMarks: "20",
    assessmentDate: "",
    durationMinutes: "",
    instructions: "",
  });
  const [substituteForm, setSubstituteForm] = useState({
    absentTeacherId: "",
    substituteTeacherId: "",
    date: "",
    classId: "",
    sectionId: "",
    subject: "",
  });
  const [gradeForm, setGradeForm] = useState({
    studentId: "",
    academicYearId: year.id,
    assessmentId: "",
    homeworkId: "",
    subject: "",
    maximumMarks: "100",
    obtainedMarks: "",
    feedback: "",
  });
  const assessments = useQuery({
    queryKey: ["v2-assessments", schoolId, role],
    queryFn: () => listAssessments(),
    enabled:
      ["/app/exams", "/app/quizzes", "/app/assessments"].includes(pathname) &&
      Boolean(schoolId) &&
      typeof window !== "undefined",
  });
  const grades = useQuery({
    queryKey: ["v2-grades", schoolId, role],
    queryFn: () => listGrades(),
    enabled: pathname === "/app/gradebook" && Boolean(schoolId) && typeof window !== "undefined",
  });
  const reports = useQuery({
    queryKey: ["v2-reports", schoolId, role],
    queryFn: () => listReportCards(),
    enabled: pathname === "/app/report-cards" && Boolean(schoolId) && typeof window !== "undefined",
  });
  const substitutes = useQuery({
    queryKey: ["v2-substitutes", schoolId, role],
    queryFn: () => listSubstituteAssignments(),
    enabled: pathname === "/app/substitutes" && Boolean(schoolId) && typeof window !== "undefined",
  });
  const timetable = useQuery({
    queryKey: ["v2-timetable", schoolId, role],
    queryFn: () => listTimetable(),
    enabled: pathname === "/app/timetable" && Boolean(schoolId) && typeof window !== "undefined",
  });
  const analytics = useQuery({
    queryKey: ["v2-analytics", schoolId, role],
    queryFn: () => getAcademicAnalytics(),
    enabled:
      ["/app/reports", "/app/analytics"].includes(pathname) &&
      Boolean(schoolId) &&
      typeof window !== "undefined",
  });
  const createAssessmentMutation = useMutation({
    mutationFn: () =>
      createAssessment({
        data: {
          academicYearId: year.id,
          title: assessmentForm.title,
          subject: assessmentForm.subject,
          classId: assessmentForm.classId,
          assessmentType: assessmentForm.assessmentType as
            "quiz" | "test" | "examination" | "assignment",
          maximumMarks: Number(assessmentForm.maximumMarks),
          assessmentDate: assessmentForm.assessmentDate,
          durationMinutes: assessmentForm.durationMinutes
            ? Number(assessmentForm.durationMinutes)
            : undefined,
          instructions: assessmentForm.instructions,
        },
      }),
    onSuccess: () => {
      toast.success("Assessment draft created");
      setAssessmentForm({
        title: "",
        subject: "",
        classId: "",
        assessmentType: "quiz",
        maximumMarks: "20",
        assessmentDate: "",
        durationMinutes: "",
        instructions: "",
      });
      void queryClient.invalidateQueries({ queryKey: ["v2-assessments"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const statusMutation = useMutation({
    mutationFn: (input: { id: string; status: "draft" | "published" | "closed" | "archived" }) =>
      updateAssessmentStatus({ data: input }),
    onSuccess: () => {
      toast.success("Assessment status saved");
      void queryClient.invalidateQueries({ queryKey: ["v2-assessments"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const substituteMutation = useMutation({
    mutationFn: () =>
      createSubstituteAssignment({
        data: {
          absentTeacherId: substituteForm.absentTeacherId,
          substituteTeacherId: substituteForm.substituteTeacherId,
          date: substituteForm.date,
          classId: substituteForm.classId,
          sectionId: substituteForm.sectionId,
          subject: substituteForm.subject,
        },
      }),
    onSuccess: () => {
      toast.success("Substitute assignment saved");
      setSubstituteForm({
        absentTeacherId: "",
        substituteTeacherId: "",
        date: "",
        classId: "",
        sectionId: "",
        subject: "",
      });
      void queryClient.invalidateQueries({ queryKey: ["v2-substitutes"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const gradeMutation = useMutation({
    mutationFn: () =>
      upsertGrade({
        data: {
          studentId: gradeForm.studentId,
          academicYearId: gradeForm.academicYearId,
          assessmentId: gradeForm.assessmentId || undefined,
          homeworkId: gradeForm.homeworkId || undefined,
          subject: gradeForm.subject,
          maximumMarks: Number(gradeForm.maximumMarks),
          obtainedMarks: Number(gradeForm.obtainedMarks),
          feedback: gradeForm.feedback,
          publicationStatus: "draft",
        },
      }),
    onSuccess: () => {
      toast.success("Grade saved as draft");
      void queryClient.invalidateQueries({ queryKey: ["v2-grades"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const reportMutation = useMutation({
    mutationFn: (id: string) => publishReportCard({ data: { id } }),
    onSuccess: () => {
      toast.success("Report card published");
      void queryClient.invalidateQueries({ queryKey: ["v2-reports"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const activeQuery =
    pathname === "/app/gradebook"
      ? grades
      : pathname === "/app/report-cards"
        ? reports
        : pathname === "/app/timetable"
          ? timetable
          : pathname === "/app/substitutes"
            ? substitutes
            : pathname === "/app/analytics" || pathname === "/app/reports"
              ? analytics
              : assessments;
  const records = activeQuery.data as unknown[] | undefined;
  return (
    <div className="space-y-6">
      <header>
        <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
          <span className="size-1.5 rounded-full bg-primary" />
          V2 academic core · observed data
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          This workspace reads school-scoped persisted academic records. It does not generate
          grades, analytics, or predictions when records are missing.
        </p>
      </header>
      {pathname === "/app/exams" ||
      pathname === "/app/quizzes" ||
      pathname === "/app/assessments" ? (
        <AssessmentForm
          form={assessmentForm}
          setForm={setAssessmentForm}
          onSubmit={() => createAssessmentMutation.mutate()}
          pending={createAssessmentMutation.isPending}
        />
      ) : null}
      {pathname === "/app/substitutes" ? (
        <SubstituteForm
          form={substituteForm}
          setForm={setSubstituteForm}
          onSubmit={() => substituteMutation.mutate()}
          pending={substituteMutation.isPending}
        />
      ) : null}
      {pathname === "/app/gradebook" &&
      ["teacher", "principal", "admin", "owner"].includes(role) ? (
        <GradeForm
          form={gradeForm}
          setForm={setGradeForm}
          onSubmit={() => gradeMutation.mutate()}
          pending={gradeMutation.isPending}
        />
      ) : null}
      {activeQuery.isLoading ? (
        <State
          icon={<Icons.Loader2 className="size-8 animate-spin" />}
          title="Loading persisted academic records…"
          body="The server is resolving the authenticated academic scope."
        />
      ) : activeQuery.isError ? (
        <State
          icon={<Icons.DatabaseZap className="size-8 text-danger/70" />}
          title="Academic data is unavailable"
          body={(activeQuery.error as Error).message}
          retry={() => activeQuery.refetch()}
        />
      ) : pathname === "/app/reports" || pathname === "/app/analytics" ? (
        <AnalyticsView data={analytics.data as AnalyticsData | undefined} />
      ) : pathname === "/app/timetable" ? (
        <TimetableView data={timetable.data} />
      ) : pathname === "/app/substitutes" ? (
        <SubstituteView data={substitutes.data} />
      ) : pathname === "/app/report-cards" ? (
        <ReportCardsView data={reports.data} onPublish={(id) => reportMutation.mutate(id)} />
      ) : pathname === "/app/gradebook" ? (
        <GradebookView data={grades.data} />
      ) : (
        <AssessmentsView
          data={assessments.data}
          role={role}
          onStatus={(id, status) => statusMutation.mutate({ id, status })}
        />
      )}
    </div>
  );
}

function AssessmentForm({
  form,
  setForm,
  onSubmit,
  pending,
}: {
  form: AssessmentFormState;
  setForm: React.Dispatch<React.SetStateAction<AssessmentFormState>>;
  onSubmit: () => void;
  pending: boolean;
}) {
  return (
    <section className="surface-panel p-5">
      <h2 className="font-semibold">Create assessment draft</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Input
          placeholder="Title"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        />
        <Input
          placeholder="Subject"
          value={form.subject}
          onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
        />
        <Input
          placeholder="Persisted class ID"
          value={form.classId}
          onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))}
        />
        <select
          className="h-10 rounded-md border bg-background px-3 text-sm"
          value={form.assessmentType}
          onChange={(e) => setForm((f) => ({ ...f, assessmentType: e.target.value }))}
        >
          <option value="quiz">Quiz</option>
          <option value="test">Test</option>
          <option value="examination">Examination</option>
          <option value="assignment">Assignment</option>
        </select>
        <Input
          type="number"
          min="1"
          placeholder="Maximum marks"
          value={form.maximumMarks}
          onChange={(e) => setForm((f) => ({ ...f, maximumMarks: e.target.value }))}
        />
        <Input
          type="date"
          value={form.assessmentDate}
          onChange={(e) => setForm((f) => ({ ...f, assessmentDate: e.target.value }))}
        />
        <Input
          type="number"
          min="1"
          placeholder="Duration minutes (optional)"
          value={form.durationMinutes}
          onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))}
        />
        <Textarea
          className="sm:col-span-2"
          placeholder="Instructions"
          value={form.instructions}
          onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
        />
      </div>
      <Button
        className="mt-4"
        disabled={pending || !form.title || !form.subject || !form.classId || !form.assessmentDate}
        onClick={onSubmit}
      >
        {pending ? "Saving…" : "Save draft"}
      </Button>
    </section>
  );
}

function GradeForm({
  form,
  setForm,
  onSubmit,
  pending,
}: {
  form: GradeFormState;
  setForm: React.Dispatch<React.SetStateAction<GradeFormState>>;
  onSubmit: () => void;
  pending: boolean;
}) {
  return (
    <section className="surface-panel p-5">
      <h2 className="font-semibold">Record grade draft</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Input
          placeholder="Persisted student ID"
          value={form.studentId}
          onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}
        />
        <Input
          placeholder="Assessment ID (or homework ID below)"
          value={form.assessmentId}
          onChange={(e) => setForm((f) => ({ ...f, assessmentId: e.target.value }))}
        />
        <Input
          placeholder="Homework ID (optional)"
          value={form.homeworkId}
          onChange={(e) => setForm((f) => ({ ...f, homeworkId: e.target.value }))}
        />
        <Input
          placeholder="Subject"
          value={form.subject}
          onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
        />
        <Input
          type="number"
          min="1"
          placeholder="Maximum marks"
          value={form.maximumMarks}
          onChange={(e) => setForm((f) => ({ ...f, maximumMarks: e.target.value }))}
        />
        <Input
          type="number"
          min="0"
          placeholder="Obtained marks"
          value={form.obtainedMarks}
          onChange={(e) => setForm((f) => ({ ...f, obtainedMarks: e.target.value }))}
        />
        <Textarea
          className="sm:col-span-2"
          placeholder="Teacher feedback"
          value={form.feedback}
          onChange={(e) => setForm((f) => ({ ...f, feedback: e.target.value }))}
        />
      </div>
      <Button
        className="mt-4"
        disabled={
          pending ||
          !form.studentId ||
          !form.subject ||
          !form.obtainedMarks ||
          (!form.assessmentId && !form.homeworkId)
        }
        onClick={onSubmit}
      >
        {pending ? "Saving…" : "Save draft"}
      </Button>
    </section>
  );
}

function AssessmentsView({
  data,
  role,
  onStatus,
}: {
  data?: AssessmentRow[];
  role: string;
  onStatus: (id: string, status: "draft" | "published" | "closed" | "archived") => void;
}) {
  if (!data?.length)
    return (
      <State
        icon={<Icons.FileQuestion className="size-8 text-muted-foreground/50" />}
        title="No assessments"
        body="Create a draft assessment to begin the manual question and publication workflow."
      />
    );
  return (
    <ListCard>
      {data.map((assessment) => (
        <div key={assessment.id}>
          <div className="flex flex-wrap items-center gap-3 p-4">
            <Icons.ClipboardList className="size-5 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{assessment.title}</p>
              <p className="text-xs text-muted-foreground">
                {assessment.subject} · {assessment.assessment_type} · {assessment.assessment_date}
              </p>
            </div>
            <Badge variant="outline">{assessment.status}</Badge>
            {assessment.status === "draft" ? (
              <Button size="sm" onClick={() => onStatus(assessment.id, "published")}>
                Publish
              </Button>
            ) : assessment.status === "published" ? (
              <Button size="sm" variant="outline" onClick={() => onStatus(assessment.id, "closed")}>
                Close
              </Button>
            ) : null}
          </div>
          <AssessmentQuestionPanel assessment={assessment} role={role} />
        </div>
      ))}
    </ListCard>
  );
}
function GradebookView({ data }: { data?: unknown[] }) {
  return data?.length ? (
    <ListCard>
      {data.map((row, index) => {
        const item = row as Record<string, unknown>;
        return (
          <div key={`${String(item.id)}-${index}`} className="flex items-center gap-3 p-4">
            <Icons.Award className="size-5 text-primary" />
            <div className="flex-1">
              <p className="font-semibold">{String(item.subject ?? "Subject")}</p>
              <p className="text-xs text-muted-foreground">
                Student {String(item.student_id)} · {String(item.publication_status)}
              </p>
            </div>
            <p className="font-bold">
              {String(item.obtained_marks)}/{String(item.maximum_marks)} · {String(item.percentage)}
              %
            </p>
          </div>
        );
      })}
    </ListCard>
  ) : (
    <State
      icon={<Icons.Table2 className="size-8 text-muted-foreground/50" />}
      title="No grade records"
      body="Grades calculated from persisted assessments and homework will appear here."
    />
  );
}
function ReportCardsView({
  data,
  onPublish,
}: {
  data?: unknown[];
  onPublish: (id: string) => void;
}) {
  return data?.length ? (
    <ListCard>
      {data.map((row, index) => {
        const item = row as Record<string, unknown>;
        return (
          <div key={`${String(item.id)}-${index}`} className="flex items-center gap-3 p-4">
            <Icons.FileBarChart className="size-5 text-primary" />
            <div className="flex-1">
              <p className="font-semibold">Student {String(item.student_id)}</p>
              <p className="text-xs text-muted-foreground">
                {String(item.status)} · {String(item.overall_percentage ?? "No published marks")} %
              </p>
            </div>
            {item.status !== "published" ? (
              <Button size="sm" onClick={() => onPublish(String(item.id))}>
                Publish
              </Button>
            ) : (
              <Badge>Published</Badge>
            )}
          </div>
        );
      })}
    </ListCard>
  ) : (
    <State
      icon={<Icons.FileBarChart className="size-8 text-muted-foreground/50" />}
      title="No report cards"
      body="Generate a report card from published grades and attendance when persisted academic data exists."
    />
  );
}
function TimetableView({ data }: { data?: unknown[] }) {
  return data?.length ? (
    <ListCard>
      {data.map((row, index) => {
        const item = row as Record<string, unknown>;
        return (
          <div key={`${String(item.id)}-${index}`} className="grid gap-1 p-4 sm:grid-cols-5">
            <span className="font-semibold">Day {String(item.weekday)}</span>
            <span>
              {String(item.start_time)}–{String(item.end_time)}
            </span>
            <span>{String(item.subject)}</span>
            <span>Room {String(item.room)}</span>
            <span className="text-muted-foreground">Teacher {String(item.teacher_id)}</span>
          </div>
        );
      })}
    </ListCard>
  ) : (
    <State
      icon={<Icons.CalendarDays className="size-8 text-muted-foreground/50" />}
      title="No timetable entries"
      body="No persisted timetable records exist for this school and academic year."
    />
  );
}
function AnalyticsView({
  data,
}: {
  data?: {
    observed: boolean;
    homework: { total: number; completed: number };
    performance: Array<Record<string, unknown>>;
    attendance: Array<Record<string, unknown>>;
  };
}) {
  if (!data) return null;
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 rounded-xl border border-info/30 bg-info-soft p-4 text-sm">
        <Icons.Info className="size-4 text-info" />
        <span>
          <strong>Observed data only.</strong> These metrics are calculated from persisted homework,
          grades, and attendance; no prediction is applied.
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Homework records" value={data.homework.total} />
        <Metric label="Completed submissions" value={data.homework.completed} />
        <Metric label="Subject aggregates" value={data.performance.length} />
      </div>
      <ListCard>
        {data.performance.length ? (
          data.performance.map((row, index) => (
            <div key={`${String(row.subject)}-${index}`} className="flex items-center gap-3 p-4">
              <Icons.BarChart3 className="size-5 text-primary" />
              <span className="flex-1 font-semibold">{String(row.subject)}</span>
              <span className="text-sm font-bold">{String(row.average_percentage)}%</span>
            </div>
          ))
        ) : (
          <State
            icon={<Icons.BarChart3 className="size-8 text-muted-foreground/50" />}
            title="No observed performance data"
            body="Publish grades before subject analytics can be calculated."
          />
        )}
      </ListCard>
    </div>
  );
}
function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric-panel p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
    </div>
  );
}
function ListCard({ children }: { children: React.ReactNode }) {
  return <section className="surface-panel divide-y">{children}</section>;
}
function State({
  icon,
  title,
  body,
  retry,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  retry?: () => void;
}) {
  return (
    <div className="surface-panel flex min-h-48 flex-col items-center justify-center p-8 text-center">
      {icon}
      <h2 className="mt-3 font-semibold">{title}</h2>
      <p className="mt-1 max-w-lg text-sm leading-6 text-muted-foreground">{body}</p>
      {retry ? (
        <Button variant="outline" className="mt-4" onClick={retry}>
          <Icons.RefreshCw className="mr-2 size-4" />
          Retry
        </Button>
      ) : null}
    </div>
  );
}

function SubstituteForm({
  form,
  setForm,
  onSubmit,
  pending,
}: {
  form: {
    absentTeacherId: string;
    substituteTeacherId: string;
    date: string;
    classId: string;
    sectionId: string;
    subject: string;
  };
  setForm: React.Dispatch<
    React.SetStateAction<{
      absentTeacherId: string;
      substituteTeacherId: string;
      date: string;
      classId: string;
      sectionId: string;
      subject: string;
    }>
  >;
  onSubmit: () => void;
  pending: boolean;
}) {
  return (
    <section className="surface-panel p-5">
      <h2 className="font-semibold">Assign substitute teacher</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Input
          placeholder="Absent teacher ID"
          value={form.absentTeacherId}
          onChange={(e) => setForm((f) => ({ ...f, absentTeacherId: e.target.value }))}
        />
        <Input
          placeholder="Substitute teacher ID"
          value={form.substituteTeacherId}
          onChange={(e) => setForm((f) => ({ ...f, substituteTeacherId: e.target.value }))}
        />
        <Input
          type="date"
          value={form.date}
          onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
        />
        <Input
          placeholder="Class ID"
          value={form.classId}
          onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))}
        />
        <Input
          placeholder="Section ID"
          value={form.sectionId}
          onChange={(e) => setForm((f) => ({ ...f, sectionId: e.target.value }))}
        />
        <Input
          placeholder="Subject"
          value={form.subject}
          onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
        />
      </div>
      <Button
        className="mt-4"
        disabled={pending || Object.values(form).some((value) => !value)}
        onClick={onSubmit}
      >
        {pending ? "Saving…" : "Assign substitute"}
      </Button>
    </section>
  );
}

function SubstituteView({ data }: { data?: unknown[] }) {
  if (!data?.length)
    return (
      <State
        icon={<Icons.UserRoundCog className="size-8 text-muted-foreground/50" />}
        title="No substitute assignments"
        body="No active substitute-teacher assignments exist for this school."
      />
    );
  return (
    <ListCard>
      {data.map((row, index) => {
        const item = row as Record<string, unknown>;
        return (
          <div
            key={`${String(item.id)}-${index}`}
            className="flex flex-wrap items-center gap-3 p-4"
          >
            <Icons.UserRoundCog className="size-5 text-primary" />
            <span className="flex-1">
              <strong>{String(item.subject)}</strong>
              <span className="ml-2 text-xs text-muted-foreground">
                {String(item.date)} · class {String(item.class_id)} · section{" "}
                {String(item.section_id)}
              </span>
            </span>
            <Badge variant="outline">{String(item.status)}</Badge>
          </div>
        );
      })}
    </ListCard>
  );
}
