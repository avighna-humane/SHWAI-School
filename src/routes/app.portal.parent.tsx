import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import * as Icons from "lucide-react";
import { useAppState } from "@/app/providers/app-state";
import { listStudents } from "@/actions/people";
import { listAiContent } from "@/actions/ai";
import {
  acknowledgeParentIntelligence,
  getIntelligenceOverview,
  requestParentMeeting,
} from "@/actions/intelligence";
import {
  listAssessments,
  listGrades,
  listTimetable,
  getAcademicAnalytics,
} from "@/actions/academic";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/portal/parent")({ component: ParentPortal });

function ParentPortal() {
  const { user, schoolId, school } = useAppState();
  const assessments = useQuery({
    queryKey: ["parent-assessments", schoolId],
    queryFn: () => listAssessments(),
    enabled: Boolean(schoolId) && typeof window !== "undefined",
  });
  const grades = useQuery({
    queryKey: ["parent-grades", schoolId],
    queryFn: () => listGrades(),
    enabled: Boolean(schoolId) && typeof window !== "undefined",
  });
  const timetable = useQuery({
    queryKey: ["parent-timetable", schoolId],
    queryFn: () => listTimetable(),
    enabled: Boolean(schoolId) && typeof window !== "undefined",
  });
  const analytics = useQuery({
    queryKey: ["parent-analytics", schoolId],
    queryFn: () => getAcademicAnalytics(),
    enabled: Boolean(schoolId) && typeof window !== "undefined",
  });
  const children = useQuery({
    queryKey: ["portal-children", schoolId],
    queryFn: () => listStudents({ data: { status: "active" } }),
    enabled: Boolean(schoolId) && typeof window !== "undefined",
  });
  const aiResources = useQuery({
    queryKey: ["parent-ai-resources", schoolId],
    queryFn: () => listAiContent(),
    enabled: Boolean(schoolId) && typeof window !== "undefined",
  });
  const intelligence = useQuery({
    queryKey: ["parent-observed-intelligence", schoolId],
    queryFn: () => getIntelligenceOverview(),
    enabled: Boolean(schoolId) && typeof window !== "undefined",
  });
  const [meetingStudentId, setMeetingStudentId] = useState<string | null>(null);
  const [meetingReason, setMeetingReason] = useState("");
  const [meetingDate, setMeetingDate] = useState(() =>
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
  );
  const acknowledgeMutation = useMutation({
    mutationFn: (studentId: string) =>
      acknowledgeParentIntelligence({
        data: {
          studentId,
          alertId: null,
          response: "Parent reviewed the published progress summary.",
        },
      }),
  });
  const meetingMutation = useMutation({
    mutationFn: ({
      studentId,
      reason,
      start,
    }: {
      studentId: string;
      reason: string;
      start: string;
    }) =>
      requestParentMeeting({
        data: {
          studentId,
          reason,
          requestedStart: new Date(start).toISOString(),
          requestedEnd: new Date(new Date(start).getTime() + 30 * 60000).toISOString(),
        },
      }),
    onSuccess: () => {
      setMeetingStudentId(null);
      setMeetingReason("");
    },
  });
  return (
    <div className="space-y-6">
      <header>
        <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
          <span className="size-1.5 rounded-full bg-primary" />
          SHWAI WORKSPACE
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight">Parent Portal</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Welcome, {user.name}. Only children linked to your authenticated parent membership are
          shown.
        </p>
      </header>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={<Icons.ClipboardList className="size-4" />}
          label="Upcoming assessments"
          value={assessments.data?.length ?? 0}
        />
        <SummaryCard
          icon={<Icons.Award className="size-4" />}
          label="Published grades"
          value={grades.data?.length ?? 0}
        />
        <SummaryCard
          icon={<Icons.CalendarDays className="size-4" />}
          label="Timetable entries"
          value={timetable.data?.length ?? 0}
        />
        <SummaryCard
          icon={<Icons.BarChart3 className="size-4" />}
          label="Observed subjects"
          value={analytics.data?.performance.length ?? 0}
        />
      </section>
      <section className="surface-panel p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
            <Icons.School className="size-5" />
          </span>
          <div>
            <p className="text-xs text-muted-foreground">School</p>
            <p className="font-semibold">{school.name}</p>
          </div>
        </div>
      </section>
      <section className="surface-panel border-ai/20 bg-ai-soft/15 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-ai text-ai-foreground">
            <Icons.Sparkles className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-ai">
              Published AI learning resources
            </p>
            <h2 className="mt-1 text-xl font-bold">Family-visible progress support</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Only teacher-approved study notes and revision sheets are visible here. Private
              student–tutor conversations are not shared with parents.
            </p>
            {aiResources.isLoading ? (
              <p className="mt-3 text-sm text-muted-foreground">Loading approved resources…</p>
            ) : aiResources.isError ? (
              <p className="mt-3 text-sm text-danger">{(aiResources.error as Error).message}</p>
            ) : (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {(
                  aiResources.data as
                    | Array<{
                        id: string;
                        title: string;
                        subject: string;
                        topic: string;
                        content_type: string;
                      }>
                    | undefined
                )
                  ?.slice(0, 4)
                  .map((resource) => (
                    <div key={resource.id} className="rounded-lg border border-border bg-card p-3">
                      <div className="flex items-center gap-2">
                        <Icons.BookOpenCheck className="size-4 text-ai" />
                        <p className="text-sm font-semibold">{resource.title}</p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {resource.content_type} · {resource.subject} · {resource.topic}
                      </p>
                    </div>
                  ))}
                {!aiResources.data?.length ? (
                  <p className="text-sm text-muted-foreground">
                    No teacher-approved AI resources are available yet.
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </section>
      <section className="surface-panel border-primary/20 bg-primary/5 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
            <Icons.BarChart3 className="size-5" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
              Observed progress summary
            </p>
            <h2 className="mt-1 text-xl font-bold">Published academic evidence</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              This summary uses published grades for linked children only. It does not expose
              internal alerts, risk classifications, private conversations, or intervention notes.
            </p>
            {intelligence.isLoading ? (
              <p className="mt-3 text-sm text-muted-foreground">Loading observed progress…</p>
            ) : intelligence.isError ? (
              <p className="mt-3 text-sm text-danger">{(intelligence.error as Error).message}</p>
            ) : (
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {(
                  intelligence.data as
                    | {
                        grades?: Array<{
                          subject: string;
                          average_percentage: number;
                          records: number;
                        }>;
                      }
                    | undefined
                )?.grades
                  ?.slice(0, 6)
                  .map((row) => (
                    <div key={row.subject} className="rounded-lg border border-border bg-card p-3">
                      <p className="text-sm font-semibold">{row.subject}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {row.average_percentage}% across {row.records} published records
                      </p>
                    </div>
                  ))}
                {!(intelligence.data as { grades?: unknown[] } | undefined)?.grades?.length ? (
                  <p className="text-sm text-muted-foreground">
                    Not enough published evidence for a subject summary.
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </section>
      {children.isLoading ? (
        <State
          title="Loading linked children…"
          icon={<Icons.Loader2 className="size-8 animate-spin" />}
        />
      ) : children.isError ? (
        <State
          title="Linked children are unavailable"
          body={(children.error as Error).message}
          icon={<Icons.DatabaseZap className="size-8 text-danger/70" />}
          retry={() => children.refetch()}
        />
      ) : children.data?.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {children.data.map((child) => (
            <section key={child.id} className="surface-panel p-5">
              <div className="flex items-start gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-primary-soft text-primary">
                  <Icons.UserRound className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold">{child.name}</h2>
                  <p className="text-xs text-muted-foreground">{child.admission_no}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {child.class_label ?? "Class unassigned"} ·{" "}
                    {child.section_name ?? "Section unassigned"}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <Link to="/app/attendance">Attendance</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link to="/app/notices">Notices</Link>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => acknowledgeMutation.mutate(child.id)}
                  disabled={acknowledgeMutation.isPending}
                >
                  Acknowledge progress
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setMeetingStudentId(meetingStudentId === child.id ? null : child.id)
                  }
                >
                  Request meeting
                </Button>
              </div>
              {meetingStudentId === child.id ? (
                <div className="mt-4 space-y-2 rounded-lg border border-border bg-muted/20 p-3">
                  <label className="block text-xs font-semibold">
                    Reason
                    <textarea
                      value={meetingReason}
                      onChange={(event) => setMeetingReason(event.target.value)}
                      rows={2}
                      placeholder="What would you like to discuss?"
                      className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                    />
                  </label>
                  <label className="block text-xs font-semibold">
                    Requested time
                    <input
                      type="datetime-local"
                      value={meetingDate}
                      onChange={(event) => setMeetingDate(event.target.value)}
                      className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
                    />
                  </label>
                  <Button
                    size="sm"
                    onClick={() =>
                      meetingMutation.mutate({
                        studentId: child.id,
                        reason: meetingReason,
                        start: meetingDate,
                      })
                    }
                    disabled={meetingMutation.isPending || meetingReason.trim().length < 2}
                  >
                    {meetingMutation.isPending ? "Sending…" : "Send request"}
                  </Button>
                  {meetingMutation.isError ? (
                    <p className="text-xs text-danger">
                      {(meetingMutation.error as Error).message}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </section>
          ))}
        </div>
      ) : (
        <State
          title="No linked children found"
          body="A school administrator must create the parent–student relationship before children appear here."
          icon={<Icons.Users className="size-8 text-muted-foreground/50" />}
        />
      )}
    </div>
  );
}

function State({
  title,
  body,
  icon,
  retry,
}: {
  title: string;
  body?: string;
  icon: React.ReactNode;
  retry?: () => void;
}) {
  return (
    <div className="surface-panel flex min-h-44 flex-col items-center justify-center p-8 text-center">
      {icon}
      <h2 className="mt-3 font-semibold">{title}</h2>
      {body ? (
        <p className="mt-1 max-w-lg text-sm leading-6 text-muted-foreground">{body}</p>
      ) : null}
      {retry ? (
        <Button variant="outline" className="mt-4" onClick={retry}>
          <Icons.RefreshCw className="mr-2 size-4" />
          Retry
        </Button>
      ) : null}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="metric-panel p-4">
      <span className="grid size-8 place-items-center rounded-lg bg-primary-soft text-primary">
        {icon}
      </span>
      <p className="mt-3 text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
    </div>
  );
}
