import * as Icons from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAppState } from "@/app/providers/app-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { NavItem } from "@/config/navigation";
import {
  createLeaveRequest,
  generateStudentIdCard,
  listCalendarEvents,
  listDocuments,
  listLeaveRequests,
} from "@/actions/v1";
import { listStudents } from "@/actions/people";
import { toast } from "sonner";

export function PersistedV1Workspace({ pathname, item }: { pathname: string; item: NavItem }) {
  const { school, schoolId, year, role } = useAppState();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [studentId, setStudentId] = useState("");
  const calendar = useQuery({
    queryKey: ["calendar-events", schoolId],
    queryFn: () => listCalendarEvents(),
    enabled: pathname === "/app/calendar" && Boolean(schoolId),
  });
  const documents = useQuery({
    queryKey: ["documents", schoolId, role],
    queryFn: () => listDocuments(),
    enabled: pathname === "/app/documents" && Boolean(schoolId),
  });
  const leave = useQuery({
    queryKey: ["leave-requests", schoolId],
    queryFn: () => listLeaveRequests(),
    enabled: pathname === "/app/leave" && Boolean(schoolId),
  });
  const students = useQuery({
    queryKey: ["id-card-students", schoolId],
    queryFn: () => listStudents({ data: { status: "active" } }),
    enabled: pathname === "/app/id-cards" && Boolean(schoolId),
  });
  const leaveMutation = useMutation({
    mutationFn: () => createLeaveRequest({ data: { startDate, endDate, reason } }),
    onSuccess: () => {
      toast.success("Leave request submitted");
      setReason("");
      void leave.refetch();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const idCardMutation = useMutation({
    mutationFn: () => generateStudentIdCard({ data: { studentId, academicYearId: year.id } }),
    onSuccess: (card) => toast.success(`ID card generated for ${card.student_name}`),
    onError: (error: Error) => toast.error(error.message),
  });

  const query =
    pathname === "/app/calendar"
      ? calendar
      : pathname === "/app/documents"
        ? documents
        : pathname === "/app/leave"
          ? leave
          : students;
  const title = item.label;
  const description =
    pathname === "/app/calendar"
      ? "Persisted school events filtered by your authenticated school membership and audience."
      : pathname === "/app/documents"
        ? "Secure document metadata and audience boundaries. File URLs are not exposed by this workspace."
        : pathname === "/app/leave"
          ? "Submit and review leave requests through a school-scoped persisted workflow."
          : pathname === "/app/id-cards"
            ? "Generate an ID-card record from the selected student's persisted identity, school, class, section and academic year."
            : "Students transitioned to alumni remain in the historical student table and are listed by persisted status.";
  return (
    <div className="space-y-6">
      <header>
        <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
          <span className="size-1.5 rounded-full bg-primary" />
          V1 persisted workflow
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
      </header>
      {pathname === "/app/leave" ? (
        <LeaveForm
          startDate={startDate}
          endDate={endDate}
          reason={reason}
          setStartDate={setStartDate}
          setEndDate={setEndDate}
          setReason={setReason}
          onSubmit={() => leaveMutation.mutate()}
          pending={leaveMutation.isPending}
        />
      ) : null}
      {pathname === "/app/id-cards" ? (
        <div className="surface-panel flex flex-wrap items-end gap-3 p-5">
          <label className="min-w-64 flex-1 text-sm font-medium">
            Student
            <select
              className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
            >
              <option value="">Select a persisted student</option>
              {students.data?.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} · {student.admission_no}
                </option>
              ))}
            </select>
          </label>
          <Button
            disabled={!studentId || idCardMutation.isPending}
            onClick={() => idCardMutation.mutate()}
          >
            {idCardMutation.isPending ? "Generating…" : "Generate ID card"}
          </Button>
        </div>
      ) : null}
      {query.isLoading ? (
        <StateCard
          icon={<Icons.Loader2 className="size-8 animate-spin" />}
          title="Loading persisted records…"
          body="The server is resolving your school membership and querying PostgreSQL."
        />
      ) : query.isError ? (
        <StateCard
          icon={<Icons.DatabaseZap className="size-8 text-danger/70" />}
          title="Persistence is unavailable"
          body={(query.error as Error).message}
          retry={() => query.refetch()}
        />
      ) : (
        <RecordList pathname={pathname} records={query.data ?? []} />
      )}
    </div>
  );
}

function LeaveForm({
  startDate,
  endDate,
  reason,
  setStartDate,
  setEndDate,
  setReason,
  onSubmit,
  pending,
}: {
  startDate: string;
  endDate: string;
  reason: string;
  setStartDate: (value: string) => void;
  setEndDate: (value: string) => void;
  setReason: (value: string) => void;
  onSubmit: () => void;
  pending: boolean;
}) {
  return (
    <section className="surface-panel p-5">
      <p className="text-sm font-semibold">New leave request</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          Start date
          <Input
            className="mt-1"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </label>
        <label className="text-sm">
          End date
          <Input
            className="mt-1"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </label>
      </div>
      <label className="mt-3 block text-sm">
        Reason
        <textarea
          className="mt-1 min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </label>
      <Button
        className="mt-4"
        disabled={pending || !startDate || !endDate || !reason.trim()}
        onClick={onSubmit}
      >
        {pending ? "Submitting…" : "Submit request"}
      </Button>
    </section>
  );
}

function RecordList({ pathname, records }: { pathname: string; records: unknown[] }) {
  if (records.length === 0)
    return (
      <StateCard
        icon={<Icons.Inbox className="size-8 text-muted-foreground/50" />}
        title="No persisted records"
        body="This school-scoped workflow has no records yet."
      />
    );
  return (
    <section className="surface-panel divide-y">
      {records.slice(0, 500).map((record, index) => {
        const item = record as Record<string, unknown>;
        const title = String(
          item.title ?? item.student_name ?? item.name ?? item.reason ?? "Record",
        );
        const meta =
          pathname === "/app/calendar"
            ? `${String(item.event_type ?? "event")} · ${String(item.starts_at ?? "")}`
            : pathname === "/app/documents"
              ? `${String(item.category ?? "document")} · access controlled`
              : pathname === "/app/leave"
                ? `${String(item.start_date ?? "")} → ${String(item.end_date ?? "")} · ${String(item.status ?? "pending")}`
                : `${String(item.admission_no ?? "")} · ${String(item.status ?? "alumni")}`;
        return (
          <div key={`${title}-${index}`} className="flex items-center gap-3 p-4">
            <span className="grid size-9 place-items-center rounded-xl bg-primary-soft text-primary">
              <Icons.FileText className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{meta}</p>
            </div>
          </div>
        );
      })}
    </section>
  );
}

function StateCard({
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
    <div className="surface-panel flex min-h-44 flex-col items-center justify-center p-8 text-center">
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
