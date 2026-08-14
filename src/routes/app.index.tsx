import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import * as Icons from "lucide-react";
import { useAppState } from "@/app/providers/app-state";
import { ROLE_LABEL } from "@/config/roles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FloatingAI } from "@/components/feedback/floating-ai";
import { getIntelligenceOverview, listIntelligenceAlerts } from "@/actions/intelligence";
import { getV5OperationsSummary } from "@/actions/operations";
import { ACTIVITY_FEED, AI_RECOMMENDATIONS, SYSTEM_STATUS } from "@/data/mock/platform";

export const Route = createFileRoute("/app/")({ component: Dashboard });

const VERSION_CARDS = [
  {
    version: "V1–V2",
    label: "Starter",
    description: "Run daily academics, attendance, assessments and family communication.",
    path: "/app/notices",
    color: "bg-info-soft text-info",
    status: "Core operations",
  },
  {
    version: "V1–V4",
    label: "Professional",
    description: "Add guided learning, teacher productivity and actionable intelligence.",
    path: "/app/intelligence/early-warning",
    color: "bg-ai-soft text-ai",
    status: "AI learning",
  },
  {
    version: "V1–V6",
    label: "Enterprise AI",
    description: "Govern operations, simulate decisions and predict school-wide needs.",
    path: "/app/ai/governance",
    color: "bg-success-soft text-success",
    status: "Decision intelligence",
  },
];

const QUICK_ACTIONS = [
  { label: "Create notice", path: "/app/notices", icon: Icons.Megaphone },
  {
    label: "Review early warning",
    path: "/app/intelligence/early-warning",
    icon: Icons.TriangleAlert,
  },
  { label: "Open interventions", path: "/app/interventions", icon: Icons.LifeBuoy },
  {
    label: "Ask leadership assistant",
    path: "/app/intelligence/assistant",
    icon: Icons.MessagesSquare,
  },
];

function Dashboard() {
  const { role, school, year, plan, offline } = useAppState();
  const overviewQuery = useQuery({
    queryKey: ["dashboard-v4-overview", school.id],
    queryFn: () => getIntelligenceOverview(),
  });
  const alertsQuery = useQuery({
    queryKey: ["dashboard-v4-alerts", school.id],
    queryFn: () => listIntelligenceAlerts(),
    enabled: !["student", "parent"].includes(role),
  });
  const operationsQuery = useQuery({
    queryKey: ["dashboard-v5-operations", school.id],
    queryFn: () => getV5OperationsSummary(),
    enabled: ["staff", "admin", "principal", "owner"].includes(role),
  });
  const overview = overviewQuery.data as unknown as
    | {
        attendance?: Array<{ attendance_percentage: number | null }>;
        homework?: Array<{ assigned: number; completed: number }>;
        aiUsage?: Array<{ requests: number; failures: number }>;
        performance?: Array<{ subject: string; average_percentage: number; records: number }>;
      }
    | undefined;
  const currentAlerts = (alertsQuery.data ?? []) as unknown as Array<{
    id: string;
    student_name: string;
    title: string;
    summary: string;
    severity: string;
  }>;
  const activeAlerts = currentAlerts.length;
  const attendanceValue = overview?.attendance?.[0]?.attendance_percentage;
  const homeworkValue = overview?.homework?.[0]?.assigned
    ? Math.round(
        (Number(overview.homework[0].completed) / Number(overview.homework[0].assigned)) * 100,
      )
    : null;
  const aiUsage = overview?.aiUsage?.[0];
  const aiSuccessRate = aiUsage?.requests
    ? Math.round(
        ((Number(aiUsage.requests) - Number(aiUsage.failures)) / Number(aiUsage.requests)) * 100,
      )
    : null;

  return (
    <div className="relative space-y-6 pb-8">
      <section className="dashboard-hero p-6 sm:p-8">
        <div className="relative z-10 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
            <span className="size-1.5 rounded-full bg-emerald-300" />
            {school.name} · {year.label}
            <Badge className="rounded-full border-white/20 bg-white/10 text-white hover:bg-white/10">
              {plan === "enterprise" ? "Enterprise AI" : plan}
            </Badge>
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Good morning, {ROLE_LABEL[role]}.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80">
            SHWAI keeps the school day connected: the records your team operates, the learning
            signals it reviews, and the governed decisions it makes.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {QUICK_ACTIONS.filter(
              (action) => role !== "student" || action.label === "Create notice",
            ).map((action) => (
              <Button
                key={action.path}
                asChild
                size="sm"
                className="border border-white/20 bg-white/15 text-white hover:bg-white/25"
              >
                <Link to={action.path}>
                  <action.icon className="mr-2 size-4" />
                  {action.label}
                </Link>
              </Button>
            ))}
          </div>
        </div>
        <div className="pointer-events-none absolute -right-8 -top-12 size-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-24 size-64 rounded-full bg-fuchsia-300/20 blur-3xl" />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Icons.Users}
          label="Students"
          value={school.students.toLocaleString("en-IN")}
          detail={`${school.teachers} teachers across ${school.campuses.length} campuses`}
          tone="primary"
        />
        <MetricCard
          icon={Icons.CalendarCheck2}
          label="Attendance"
          value={attendanceValue == null ? "Insufficient data" : `${attendanceValue}%`}
          detail="Persisted attendance · last 30 days"
          tone="success"
        />
        <MetricCard
          icon={Icons.TriangleAlert}
          label="Active signals"
          value={String(activeAlerts)}
          detail="Require human review, not automatic action"
          tone="warning"
        />
        <MetricCard
          icon={Icons.ShieldCheck}
          label="AI evidence coverage"
          value={aiSuccessRate == null ? "Insufficient data" : `${aiSuccessRate}%`}
          detail="V3 AI request success rate · last 30 days"
          tone="ai"
        />
      </section>

      {["staff", "admin", "principal", "owner"].includes(role) ? (
        <section className="surface-panel p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                V5 enterprise operations
              </p>
              <h2 className="mt-1 text-xl font-bold tracking-tight">
                Operate from persisted records
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Admissions, fees, transport, library, inventory, facilities, workload and learning
                debt are shown only when records exist.
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to={"/app/operations" as never}>
                Open operations <Icons.ArrowUpRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DashboardOpsMetric
              label="Admissions"
              value={String(
                (operationsQuery.data?.admissions ?? []).reduce(
                  (sum, row) => sum + Number((row as { count?: number }).count ?? 0),
                  0,
                ),
              )}
            />
            <DashboardOpsMetric
              label="Fee accounts"
              value={String(
                (operationsQuery.data?.fees ?? []).reduce(
                  (sum, row) => sum + Number((row as { count?: number }).count ?? 0),
                  0,
                ),
              )}
            />
            <DashboardOpsMetric
              label="Reorder alerts"
              value={String(operationsQuery.data?.inventory?.[0]?.reorder_alerts ?? 0)}
            />
            <DashboardOpsMetric
              label="Open learning debt"
              value={String(
                (operationsQuery.data?.debt ?? []).reduce(
                  (sum, row) => sum + Number((row as { count?: number }).count ?? 0),
                  0,
                ),
              )}
            />
          </div>
        </section>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.8fr]">
        <section className="surface-panel p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                School intelligence
              </p>
              <h2 className="mt-1 text-xl font-bold tracking-tight">
                A connected view of progress
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Attendance, academic performance and homework completion over the latest six
                reporting periods.
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to={"/app/intelligence/school" as never}>
                Open school intelligence <Icons.ArrowUpRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
          <div className="mt-7 space-y-4" aria-label="Persisted school performance summary">
            {overview?.performance?.length ? (
              overview.performance.slice(0, 6).map((row) => (
                <div key={row.subject} className="flex items-center gap-3">
                  <span className="w-32 truncate text-sm font-semibold">{row.subject}</span>
                  <div className="h-2 flex-1 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{
                        width: `${Math.max(0, Math.min(100, Number(row.average_percentage)))}%`,
                      }}
                    />
                  </div>
                  <span className="w-20 text-right text-sm font-bold tabular-nums">
                    {row.average_percentage}%
                  </span>
                  <span className="text-xs text-muted-foreground">n={row.records}</span>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Insufficient data for a persisted subject summary.
              </div>
            )}
          </div>
          <div className="mt-5 flex flex-wrap gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
            <span>
              Attendance · {attendanceValue == null ? "Insufficient data" : `${attendanceValue}%`}{" "}
              over 30 days
            </span>
            <span>
              Homework · {homeworkValue == null ? "Insufficient data" : `${homeworkValue}%`} over 30
              days
            </span>
          </div>
        </section>

        <section className="surface-panel p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Attention queue
              </p>
              <h2 className="mt-1 text-xl font-bold tracking-tight">Signals to review</h2>
            </div>
            <Badge className="rounded-full bg-warning-soft text-warning-foreground">
              {activeAlerts} open
            </Badge>
          </div>
          <div className="mt-5 space-y-3">
            {alertsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading persisted alerts…</p>
            ) : alertsQuery.isError ? (
              <p className="text-sm text-danger">{(alertsQuery.error as Error).message}</p>
            ) : (
              currentAlerts.slice(0, 4).map((alert) => (
                <Link
                  key={alert.id}
                  to={"/app/intelligence/early-warning" as never}
                  className="group flex items-center gap-3 rounded-xl border border-border/70 p-3 transition-colors hover:bg-muted/50"
                >
                  <span
                    className={`grid size-8 shrink-0 place-items-center rounded-lg ${alert.severity === "urgent" ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning-foreground"}`}
                  >
                    <Icons.TriangleAlert className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {alert.student_name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {alert.title}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {alert.summary}
                    </span>
                  </span>
                </Link>
              ))
            )}
            {!currentAlerts.length && !alertsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">
                No persisted alerts are open. Run an intelligence scan after data is available.
              </p>
            ) : null}
          </div>
          <Button asChild variant="ghost" size="sm" className="mt-3 w-full justify-between">
            <Link to={"/app/intelligence/early-warning" as never}>
              Review evidence and assign follow-up <Icons.ArrowRight className="size-4" />
            </Link>
          </Button>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr_0.9fr]">
        <section className="surface-panel p-5 sm:p-6">
          <SectionHeading eyebrow="Product structure" title="The SHWAI roadmap" />
          <div className="mt-5 space-y-3">
            {VERSION_CARDS.map((item) => (
              <Link
                key={item.version}
                to={item.path}
                className="group flex gap-3 rounded-xl border border-border/70 p-3.5 transition-colors hover:bg-muted/50"
              >
                <span
                  className={`grid size-10 shrink-0 place-items-center rounded-xl text-xs font-extrabold ${item.color}`}
                >
                  {item.version}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    {item.label}
                    <Icons.ArrowUpRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    {item.description}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="surface-panel p-5 sm:p-6">
          <SectionHeading eyebrow="Governed AI" title="Recommendations with context" />
          <div className="mt-5 space-y-4">
            {AI_RECOMMENDATIONS.slice(0, 3).map((item) => (
              <div key={item.id} className="border-l-2 border-ai pl-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge className="rounded-full bg-ai-soft text-ai">
                    {Math.round(item.confidence * 100)}% confidence
                  </Badge>
                  {item.approved ? (
                    <span className="text-[11px] font-semibold text-success">Approved</span>
                  ) : (
                    <span className="text-[11px] font-semibold text-warning-foreground">
                      Review needed
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm font-semibold leading-5">{item.title}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
          <Button asChild variant="outline" size="sm" className="mt-5 w-full">
            <Link to={"/app/ai/provenance" as never}>Inspect evidence and version history</Link>
          </Button>
        </section>

        <section className="surface-panel p-5 sm:p-6">
          <SectionHeading eyebrow="System health" title="Operational status" />
          <div className="mt-5 flex items-center gap-3 rounded-xl bg-success-soft p-3">
            <span className="grid size-9 place-items-center rounded-full bg-success text-success-foreground">
              <Icons.Check className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold">{SYSTEM_STATUS.message}</p>
              <p className="text-xs text-muted-foreground">Last sync {SYSTEM_STATUS.lastSync}</p>
            </div>
          </div>
          <div className="mt-4 space-y-2.5">
            {SYSTEM_STATUS.components.map((component) => (
              <div key={component.name} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{component.name}</span>
                <span
                  className={`flex items-center gap-1.5 text-xs font-semibold ${component.state === "degraded" ? "text-warning-foreground" : "text-success"}`}
                >
                  <span
                    className={`size-1.5 rounded-full ${component.state === "degraded" ? "bg-warning" : "bg-success"}`}
                  />
                  {component.state}
                </span>
              </div>
            ))}
          </div>
          {offline ? (
            <div className="mt-4 rounded-lg bg-warning-soft p-3 text-xs leading-5 text-warning-foreground">
              Offline mode is active. New attendance and marks will remain local until the next
              sync.
            </div>
          ) : null}
        </section>
      </div>

      <section className="surface-panel p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <SectionHeading eyebrow="Activity feed" title="What changed across the school" />
          <Button asChild variant="ghost" size="sm">
            <Link to="/app/notifications">
              View all notifications <Icons.ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {ACTIVITY_FEED.slice(0, 4).map((item) => (
            <div key={item.id} className="rounded-xl border border-border/70 p-3.5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="size-1.5 rounded-full bg-primary" />
                {item.at}
              </div>
              <p className="mt-2 text-sm leading-5">
                <span className="font-semibold">{item.actor}</span> {item.action}{" "}
                <span className="font-semibold">{item.target}</span>
              </p>
            </div>
          ))}
        </div>
      </section>

      <FloatingAI />
    </div>
  );
}

function DashboardOpsMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-extrabold tabular-nums">{value}</p>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: Icons.LucideIcon;
  label: string;
  value: string;
  detail: string;
  tone: "primary" | "success" | "warning" | "ai";
}) {
  const toneClasses = {
    primary: "bg-primary-soft text-primary",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning-foreground",
    ai: "bg-ai-soft text-ai",
  };
  return (
    <div className="metric-panel p-4">
      <div className="flex items-center justify-between gap-3">
        <span className={`grid size-9 place-items-center rounded-xl ${toneClasses[tone]}`}>
          <Icon className="size-4" />
        </span>
        <Icons.MoreHorizontal className="size-4 text-muted-foreground" />
      </div>
      <p className="mt-4 text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tracking-tight text-numeric">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-xl font-bold tracking-tight">{title}</h2>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`size-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}

export default Dashboard;
