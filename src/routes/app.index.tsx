import { createFileRoute, Link } from "@tanstack/react-router";
import * as Icons from "lucide-react";
import { useAppState } from "@/app/providers/app-state";
import { ROLE_LABEL } from "@/config/roles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FloatingAI } from "@/components/feedback/floating-ai";
import { SCHOOL_TRENDS, RISK_ALERTS } from "@/data/mock/intelligence";
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
  const latestTrend = SCHOOL_TRENDS[SCHOOL_TRENDS.length - 1];
  const activeAlerts = RISK_ALERTS.filter((alert) => alert.status !== "resolved").length;
  const highConfidence = Math.round(
    (AI_RECOMMENDATIONS.filter((item) => item.confidence >= 0.8).length /
      AI_RECOMMENDATIONS.length) *
      100,
  );

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
          value={`${latestTrend.attendance}%`}
          detail="School trend · latest period"
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
          value={`${highConfidence}%`}
          detail="Recommendations at ≥80% confidence"
          tone="ai"
        />
      </section>

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
          <div
            className="mt-7 grid grid-cols-6 items-end gap-3 sm:gap-5"
            aria-label="School trend chart"
          >
            {SCHOOL_TRENDS.map((trend) => (
              <div key={trend.month} className="space-y-2 text-center">
                <div className="flex h-40 items-end justify-center gap-1.5 sm:gap-2">
                  <div
                    className="w-2.5 rounded-t-full bg-primary/80 sm:w-3"
                    style={{ height: `${trend.performance * 1.3}%` }}
                    title={`Performance ${trend.performance}%`}
                  />
                  <div
                    className="w-2.5 rounded-t-full bg-success/80 sm:w-3"
                    style={{ height: `${trend.attendance * 1.3}%` }}
                    title={`Attendance ${trend.attendance}%`}
                  />
                  <div
                    className="w-2.5 rounded-t-full bg-ai/70 sm:w-3"
                    style={{ height: `${trend.homework * 1.3}%` }}
                    title={`Homework ${trend.homework}%`}
                  />
                </div>
                <p className="text-xs font-semibold text-muted-foreground">{trend.month}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
            <Legend color="bg-primary" label="Performance" />
            <Legend color="bg-success" label="Attendance" />
            <Legend color="bg-ai" label="Homework" />
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
            {RISK_ALERTS.slice(0, 4).map((alert) => (
              <Link
                key={alert.id}
                to={"/app/intelligence/early-warning" as never}
                className="group flex items-center gap-3 rounded-xl border border-border/70 p-3 transition-colors hover:bg-muted/50"
              >
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-lg ${alert.riskScore >= 80 ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning-foreground"}`}
                >
                  <Icons.TriangleAlert className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{alert.studentName}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {alert.classLabel} · {alert.riskType.replaceAll("-", " ")}
                  </span>
                </span>
                <span className="text-sm font-bold tabular-nums text-foreground">
                  {alert.riskScore}
                </span>
              </Link>
            ))}
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
