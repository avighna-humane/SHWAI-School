import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import * as Icons from "lucide-react";
import { useAppState } from "@/app/providers/app-state";
import { listStudents } from "@/actions/people";
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
              <div className="mt-4 flex gap-2">
                <Button asChild size="sm">
                  <Link to="/app/attendance">Attendance</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link to="/app/notices">Notices</Link>
                </Button>
              </div>
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
