import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import * as Icons from "lucide-react";
import { toast } from "sonner";
import { useAppState } from "@/app/providers/app-state";
import { getDemoIds } from "@/lib/demo-ids";
import { STUDENTS } from "@/data/mock/people";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  listAttendance,
  saveAttendance,
  type AttendanceRow,
  type AttendanceStatus,
} from "@/actions/attendance";
import { withTimeout } from "@/lib/request-timeout";

export const Route = createFileRoute("/app/attendance")({ component: AttendancePage });

const STATUS_CYCLE: Array<AttendanceStatus | undefined> = [
  undefined,
  "present",
  "absent",
  "late",
  "leave",
];
const STAFF_ROLES = new Set(["teacher", "principal", "admin", "owner"]);

function today() {
  return new Date().toISOString().slice(0, 10);
}

function statusLabel(status?: AttendanceStatus) {
  return status ? status[0]!.toUpperCase() + status.slice(1) : "Unmarked";
}

function statusClass(status?: AttendanceStatus) {
  if (status === "present") return "bg-success-soft text-success";
  if (status === "absent") return "bg-danger-soft text-danger";
  if (status === "late") return "bg-warning-soft text-warning-foreground";
  if (status === "leave") return "bg-info-soft text-info";
  return "bg-muted text-muted-foreground";
}

function AttendancePage() {
  const { role, school, year } = useAppState();
  const identity = getDemoIds(role);
  const [date, setDate] = useState(today);
  const [draft, setDraft] = useState<Record<string, AttendanceStatus | undefined>>({});
  const queryClient = useQueryClient();
  const canMark = STAFF_ROLES.has(role);
  const roster = useMemo(() => {
    if (role === "student") return STUDENTS.filter((student) => student.id === identity.userId);
    if (role === "parent")
      return STUDENTS.filter((student) => ["stu-1", "stu-2"].includes(student.id));
    return STUDENTS.slice(0, 24);
  }, [identity.userId, role]);

  const query = useQuery({
    queryKey: ["attendance", school.id, role, identity.userId, date],
    queryFn: () =>
      withTimeout(
        listAttendance({
          data: {
            schoolId: school.id,
            actorSchoolId: school.id,
            actorRole: role as "teacher" | "principal" | "admin" | "owner" | "student" | "parent",
            actorId: identity.userId,
            date,
            studentId: canMark ? undefined : identity.userId,
          },
        }),
      ),
    enabled: typeof window !== "undefined",
  });

  useEffect(() => {
    const next: Record<string, AttendanceStatus | undefined> = {};
    for (const row of query.data ?? []) next[row.student_id] = row.status;
    setDraft(next);
  }, [date, query.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      saveAttendance({
        data: {
          schoolId: school.id,
          actorSchoolId: school.id,
          actorRole: role as "teacher" | "principal" | "admin" | "owner",
          actorId: identity.userId,
          actorName: identity.userName,
          date,
          records: roster
            .filter((student) => draft[student.id])
            .map((student) => ({
              studentId: student.id,
              studentName: student.name,
              classId: student.classId,
              status: draft[student.id]!,
            })),
        },
      }),
    onSuccess: (result) => {
      toast.success(`${result.saved.length} attendance records saved`);
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const summary = useMemo(() => {
    const statuses = roster.map((student) => draft[student.id]);
    return {
      present: statuses.filter((status) => status === "present").length,
      absent: statuses.filter((status) => status === "absent").length,
      late: statuses.filter((status) => status === "late").length,
      unmarked: statuses.filter((status) => !status).length,
    };
  }, [draft, roster]);

  function cycleStatus(studentId: string) {
    if (!canMark) return;
    const current = draft[studentId];
    const nextIndex = (STATUS_CYCLE.indexOf(current) + 1) % STATUS_CYCLE.length;
    setDraft((previous) => ({ ...previous, [studentId]: STATUS_CYCLE[nextIndex] }));
  }

  return (
    <div className="space-y-6 pb-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
            <span className="size-1.5 rounded-full bg-primary" />
            SHWAI workspace
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight">Attendance</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Persisted daily attendance for {school.name} · {year.label}.{" "}
            {canMark
              ? "Click a status to cycle through present, absent, late and leave, then save the register."
              : "Your view is read-only."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="w-auto"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
          >
            <Icons.RefreshCw className={`mr-2 size-4 ${query.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={Icons.CheckCircle2} label="Present" value={summary.present} tone="success" />
        <Metric icon={Icons.XCircle} label="Absent" value={summary.absent} tone="danger" />
        <Metric icon={Icons.Clock3} label="Late" value={summary.late} tone="warning" />
        <Metric icon={Icons.HelpCircle} label="Unmarked" value={summary.unmarked} tone="muted" />
      </div>

      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState message={(query.error as Error).message} onRetry={() => query.refetch()} />
      ) : (
        <section className="surface-panel overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5 sm:p-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Daily register
              </p>
              <h2 className="mt-1 text-xl font-bold tracking-tight">
                {new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-full">
                {query.data?.length ?? 0} saved
              </Badge>
              {canMark ? (
                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending || summary.unmarked === roster.length}
                >
                  <Icons.Save className="mr-2 size-4" />
                  {saveMutation.isPending ? "Saving…" : "Save register"}
                </Button>
              ) : null}
            </div>
          </div>
          {roster.length === 0 ? (
            <div className="p-12 text-center">
              <Icons.Users className="mx-auto size-10 text-muted-foreground/40" />
              <h3 className="mt-3 font-semibold">No students in this view</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                This role has no mapped students for the selected date.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Student</th>
                    <th className="px-5 py-3 font-semibold">Class</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 text-right font-semibold">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {roster.map((student) => {
                    const status = draft[student.id];
                    const persisted = (query.data as AttendanceRow[] | undefined)?.find(
                      (row) => row.student_id === student.id,
                    );
                    return (
                      <tr key={student.id} className="transition-colors hover:bg-muted/30">
                        <td className="px-5 py-4">
                          <p className="font-semibold">{student.name}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {student.admissionNo}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-muted-foreground">
                          Grade {student.grade} — {student.section}
                        </td>
                        <td className="px-5 py-4">
                          {canMark ? (
                            <button
                              type="button"
                              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-transform active:scale-95 ${statusClass(status)}`}
                              onClick={() => cycleStatus(student.id)}
                              aria-label={`Set ${student.name} attendance status`}
                            >
                              {statusLabel(status)}
                            </button>
                          ) : (
                            <span
                              className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${statusClass(status)}`}
                            >
                              {statusLabel(status)}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right text-xs text-muted-foreground">
                          {persisted ? `Saved by ${persisted.marked_by}` : "Not saved"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="border-t border-border bg-muted/20 px-5 py-3 text-xs leading-5 text-muted-foreground">
            Attendance writes are stored per school, student and date. Each save creates an audit
            event. If the database is not configured, SHWAI reports a configuration error instead of
            presenting a fake success.
          </div>
        </section>
      )}
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: Icons.LucideIcon;
  label: string;
  value: number;
  tone: "success" | "danger" | "warning" | "muted";
}) {
  const classes = {
    success: "bg-success-soft text-success",
    danger: "bg-danger-soft text-danger",
    warning: "bg-warning-soft text-warning-foreground",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <div className="metric-panel p-4">
      <span className={`grid size-9 place-items-center rounded-xl ${classes[tone]}`}>
        <Icon className="size-4" />
      </span>
      <p className="mt-4 text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tracking-tight text-numeric">{value}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="surface-panel flex min-h-64 items-center justify-center text-sm text-muted-foreground">
      <Icons.Loader2 className="mr-2 size-5 animate-spin" />
      Loading persisted attendance…
    </div>
  );
}
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="surface-panel flex min-h-64 flex-col items-center justify-center p-8 text-center">
      <Icons.DatabaseZap className="size-10 text-danger/60" />
      <h2 className="mt-3 font-semibold">Attendance is unavailable</h2>
      <p className="mt-1 max-w-lg text-sm leading-6 text-muted-foreground">{message}</p>
      <Button variant="outline" className="mt-4" onClick={onRetry}>
        <Icons.RefreshCw className="mr-2 size-4" />
        Retry
      </Button>
    </div>
  );
}
