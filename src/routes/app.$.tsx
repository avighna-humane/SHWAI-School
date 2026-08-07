import { createFileRoute, useRouterState } from "@tanstack/react-router";
import * as Icons from "lucide-react";
import { useAppState } from "@/app/providers/app-state";
import { ALL_NAV_ITEMS } from "@/config/navigation";
import { planAllows } from "@/config/plans";
import { EmptyState, FeatureLocked, PermissionDenied } from "@/components/feedback/states";
import { ROLE_LABEL } from "@/config/roles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { FloatingAI } from "@/components/feedback/floating-ai";

export const Route = createFileRoute("/app/$")({ component: ModuleWorkspace });

type ModuleView = {
  section: string;
  stats: Array<{ label: string; value: string; delta: string; icon: keyof typeof Icons; tone: string }>;
  rows: Array<{ title: string; detail: string; value: string; tone?: string }>;
  chartTitle: string;
  chartCaption: string;
  chartValues: number[];
  insightTitle: string;
  insight: string;
};

const DEFAULT_STATS: ModuleView["stats"] = [
  { label: "Active records", value: "1,284", delta: "+4.8% this month", icon: "Layers3", tone: "bg-primary-soft text-primary" },
  { label: "Needs attention", value: "18", delta: "4 due this week", icon: "TriangleAlert", tone: "bg-warning-soft text-warning" },
  { label: "Completion rate", value: "86%", delta: "+6 pts vs last month", icon: "ChartNoAxesCombined", tone: "bg-success-soft text-success" },
  { label: "Last updated", value: "Today", delta: "Synced 8 min ago", icon: "RefreshCw", tone: "bg-info-soft text-info" },
];

const MODULE_VIEWS: Record<string, Partial<ModuleView>> = {
  Calendar: {
    section: "School rhythm",
    stats: [
      { label: "Events this month", value: "24", delta: "6 upcoming this week", icon: "CalendarDays", tone: "bg-primary-soft text-primary" },
      { label: "Open reminders", value: "8", delta: "2 need an owner", icon: "BellRing", tone: "bg-warning-soft text-warning" },
      { label: "Attendance days", value: "18", delta: "On track for the term", icon: "CalendarCheck", tone: "bg-success-soft text-success" },
      { label: "Next milestone", value: "6 days", delta: "Mid-term assessments", icon: "Flag", tone: "bg-ai-soft text-ai" },
    ],
    chartTitle: "Activity across the school calendar",
    chartCaption: "Planned events and participation · September 2026",
    chartValues: [38, 52, 45, 72, 64, 84, 69, 91, 76, 88, 74, 96],
  },
  Homework: {
    section: "Learning progress",
    stats: [
      { label: "Active assignments", value: "42", delta: "8 due this week", icon: "NotebookPen", tone: "bg-primary-soft text-primary" },
      { label: "On-time rate", value: "84%", delta: "+5 pts this term", icon: "CircleCheck", tone: "bg-success-soft text-success" },
      { label: "To review", value: "126", delta: "Down from 148", icon: "ClipboardCheck", tone: "bg-warning-soft text-warning" },
      { label: "AI-assisted", value: "18", delta: "Teacher approval required", icon: "Sparkles", tone: "bg-ai-soft text-ai" },
    ],
    chartTitle: "Submission momentum",
    chartCaption: "On-time submissions by week · Current term",
    chartValues: [46, 58, 54, 68, 63, 76, 72, 84, 79, 88, 83, 91],
  },
  Attendance: {
    section: "Daily pulse",
    stats: [
      { label: "Present today", value: "93.4%", delta: "1,199 of 1,284 present", icon: "UserCheck", tone: "bg-success-soft text-success" },
      { label: "Late arrivals", value: "28", delta: "7 fewer than yesterday", icon: "Clock3", tone: "bg-warning-soft text-warning" },
      { label: "Unmarked classes", value: "4", delta: "All before 10:30 AM", icon: "ClipboardPenLine", tone: "bg-primary-soft text-primary" },
      { label: "Weekly average", value: "95.8%", delta: "+2.1 pts this week", icon: "ChartNoAxesCombined", tone: "bg-ai-soft text-ai" },
    ],
    chartTitle: "Attendance trend",
    chartCaption: "Daily presence across the school · September 2026",
    chartValues: [78, 83, 81, 88, 86, 91, 89, 94, 92, 96, 94, 97],
  },
  Gradebook: {
    section: "Academic performance",
    stats: [
      { label: "Assessments", value: "38", delta: "12 awaiting review", icon: "ClipboardCheck", tone: "bg-primary-soft text-primary" },
      { label: "Average score", value: "74%", delta: "+3 pts vs last term", icon: "ChartSpline", tone: "bg-success-soft text-success" },
      { label: "Feedback shared", value: "68%", delta: "Target is 75%", icon: "MessageSquareText", tone: "bg-ai-soft text-ai" },
      { label: "At-risk learners", value: "22", delta: "6 critical follow-ups", icon: "TriangleAlert", tone: "bg-danger-soft text-danger" },
    ],
    chartTitle: "Performance by assessment",
    chartCaption: "Average scores across recent assessments",
    chartValues: [62, 68, 65, 74, 71, 78, 76, 82, 79, 86, 81, 88],
  },
  Students: {
    section: "People overview",
    stats: [
      { label: "Total students", value: "1,284", delta: "+3.2% vs last term", icon: "GraduationCap", tone: "bg-primary-soft text-primary" },
      { label: "New this term", value: "84", delta: "14 applications pending", icon: "UserPlus", tone: "bg-success-soft text-success" },
      { label: "Support plans", value: "42", delta: "8 reviews due this week", icon: "HeartHandshake", tone: "bg-warning-soft text-warning" },
      { label: "Data completeness", value: "97%", delta: "+1.4 pts this month", icon: "BadgeCheck", tone: "bg-ai-soft text-ai" },
    ],
    chartTitle: "Enrollment movement",
    chartCaption: "Student count and admissions movement · Current year",
    chartValues: [42, 49, 56, 61, 67, 72, 78, 75, 83, 87, 92, 96],
  },
  Teachers: {
    section: "Staff wellbeing",
    stats: [
      { label: "Faculty members", value: "61", delta: "58 present today", icon: "Presentation", tone: "bg-primary-soft text-primary" },
      { label: "Open cover needs", value: "3", delta: "2 resolved this morning", icon: "CalendarCog", tone: "bg-warning-soft text-warning" },
      { label: "Workload health", value: "82%", delta: "Stable for 3 weeks", icon: "Gauge", tone: "bg-success-soft text-success" },
      { label: "Check-ins due", value: "9", delta: "Across 4 departments", icon: "MessageCircle", tone: "bg-ai-soft text-ai" },
    ],
    chartTitle: "Faculty workload health",
    chartCaption: "Average workload index by week",
    chartValues: [64, 68, 67, 72, 70, 76, 74, 79, 77, 82, 80, 82],
  },
  Reports: {
    section: "Decision support",
    stats: [
      { label: "Reports ready", value: "18", delta: "4 generated today", icon: "FileBarChart", tone: "bg-primary-soft text-primary" },
      { label: "Scheduled", value: "6", delta: "Next one Friday at 9 AM", icon: "CalendarClock", tone: "bg-ai-soft text-ai" },
      { label: "Viewed this week", value: "142", delta: "+18% vs last week", icon: "Eye", tone: "bg-success-soft text-success" },
      { label: "Data freshness", value: "98%", delta: "All core sources synced", icon: "Database", tone: "bg-info-soft text-info" },
    ],
    chartTitle: "Report engagement",
    chartCaption: "Views and exports across the last 12 weeks",
    chartValues: [32, 38, 45, 41, 54, 58, 62, 68, 65, 76, 82, 91],
  },
  Analytics: {
    section: "School intelligence",
    stats: [
      { label: "Health score", value: "87/100", delta: "+4 pts since Monday", icon: "Activity", tone: "bg-success-soft text-success" },
      { label: "Signals tracked", value: "36", delta: "5 new this week", icon: "Radar", tone: "bg-primary-soft text-primary" },
      { label: "Positive trend", value: "71%", delta: "Across 8 indicators", icon: "TrendingUp", tone: "bg-ai-soft text-ai" },
      { label: "Data coverage", value: "94%", delta: "Last sync 8 minutes ago", icon: "Database", tone: "bg-info-soft text-info" },
    ],
    chartTitle: "School health trend",
    chartCaption: "Composite health score across the current term",
    chartValues: [58, 63, 61, 69, 67, 73, 72, 78, 76, 82, 84, 87],
  },
};

const DEFAULT_ROWS = [
  { title: "Grade 8 attendance has softened", detail: "Needs a short check-in with the homeroom team", value: "Review", tone: "bg-warning-soft text-warning" },
  { title: "2 approvals are waiting", detail: "Field trip requests need your review", value: "Open", tone: "bg-primary-soft text-primary" },
  { title: "Staff check-in pattern", detail: "3 new absences since 7:30 AM", value: "Monitor", tone: "bg-ai-soft text-ai" },
  { title: "School health is moving up", detail: "Up 4 points since last Monday", value: "87%", tone: "bg-success-soft text-success" },
];

function getModuleView(label: string): ModuleView {
  const view = MODULE_VIEWS[label] ?? {};
  return {
    section: view.section ?? "Workspace overview",
    stats: view.stats ?? DEFAULT_STATS,
    rows: view.rows ?? DEFAULT_ROWS,
    chartTitle: view.chartTitle ?? `${label} activity`,
    chartCaption: view.chartCaption ?? `A clear view of your ${label.toLowerCase()} signals`,
    chartValues: view.chartValues ?? [42, 48, 45, 58, 54, 65, 62, 72, 68, 78, 74, 84],
    insightTitle: view.insightTitle ?? "A thoughtful nudge from SHWAI",
    insight: view.insight ?? "Your role-based signals are ready for a quick review. Use the actions on this page to keep the school day moving.",
  };
}

function ModuleWorkspace() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { role, plan } = useAppState();
  const item = ALL_NAV_ITEMS.find((i) => i.path === pathname);

  if (!item) {
    return (
      <EmptyState
        title="Module not found"
        description={`No SHWAI module is mapped to ${pathname}. Use the command palette (⌘K) to jump to a module.`}
        icon={<Icons.CircleHelp className="size-6" aria-hidden />}
      />
    );
  }
  if (!item.roles.includes(role)) return <PermissionDenied role={ROLE_LABEL[role]} />;
  if (item.plan && !planAllows(plan, item.plan)) return <FeatureLocked required={item.plan} current={plan} />;

  const view = getModuleView(item.label);
  const ModuleIcon = (Icons as unknown as Record<string, Icons.LucideIcon>)[item.icon] ?? Icons.LayoutGrid;

  return (
    <div className="relative space-y-6">
      <header className="grid gap-5 sm:flex sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
            <span className="size-1.5 rounded-full bg-primary" /> {view.section}
          </p>
          <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            <h1 className="truncate text-3xl font-extrabold tracking-tight">{item.label}</h1>
            {item.badge ? <Badge className="rounded-full bg-ai-soft px-2.5 text-ai">{item.badge}</Badge> : null}
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{item.description}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => toast.success("Export queued — mock file ready")}>
            <Icons.Download className="size-4" aria-hidden /> Export
          </Button>
          <Button size="sm" className="rounded-full" onClick={() => toast.success("Recorded in this frontend demo")}>
            <Icons.Plus className="size-4" aria-hidden /> New
          </Button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label={`${item.label} key metrics`}>
        {view.stats.map((stat) => {
          const StatIcon = (Icons as unknown as Record<string, Icons.LucideIcon>)[stat.icon] ?? Icons.Circle;
          return (
            <article key={stat.label} className="metric-panel p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-muted-foreground">{stat.label}</p>
                <span className={`grid size-9 place-items-center rounded-xl ${stat.tone}`}>
                  <StatIcon className="size-4" aria-hidden />
                </span>
              </div>
              <p className="mt-4 text-3xl font-extrabold tracking-tight text-numeric">{stat.value}</p>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="inline-flex rounded-full bg-success-soft px-1.5 py-0.5 font-semibold text-success">↗</span>
                {stat.delta}
              </p>
            </article>
          );
        })}
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="surface-panel p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold">{view.chartTitle}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{view.chartCaption}</p>
            </div>
            <Button variant="ghost" size="sm" className="rounded-full text-xs text-primary" onClick={() => toast.success("Detailed trend opened in this demo")}>
              View details <Icons.ArrowUpRight className="size-3.5" aria-hidden />
            </Button>
          </div>
          <div className="mt-6 flex h-56 items-end gap-1.5 border-b border-border px-1 sm:gap-3">
            {view.chartValues.map((value, index) => (
              <div key={`${value}-${index}`} className="group flex h-full flex-1 items-end">
                <div
                  className="relative w-full rounded-t-lg bg-gradient-to-t from-primary/80 to-primary/25 transition-all duration-300 group-hover:from-primary group-hover:to-primary/50"
                  style={{ height: `${Math.max(value, 12)}%` }}
                >
                  <span className="absolute -top-6 left-1/2 hidden -translate-x-1/2 rounded bg-foreground px-1.5 py-0.5 text-[10px] text-background group-hover:block">
                    {value}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-between text-[10px] text-muted-foreground">
            <span>Week 1</span><span>Week 4</span><span>Week 8</span><span>Week 12</span>
          </div>
        </section>

        <aside className="surface-panel bg-gradient-to-br from-card via-card to-ai-soft/45 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-xl bg-ai-soft text-ai"><Icons.Sparkles className="size-4" aria-hidden /></span>
              <div>
                <h2 className="text-sm font-bold">AI briefing</h2>
                <p className="text-[11px] text-muted-foreground">A thoughtful nudge from SHWAI</p>
              </div>
            </div>
            <Badge variant="outline" className="rounded-full border-ai/20 text-[10px] text-ai">Today</Badge>
          </div>
          <h3 className="mt-6 text-sm font-semibold">{view.insightTitle}</h3>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">{view.insight}</p>
          <Button size="sm" className="mt-5 rounded-full bg-ai text-ai-foreground hover:bg-ai/90" onClick={() => toast.success("AI review opened in this demo")}>
            Review pattern <Icons.ArrowRight className="size-3.5" aria-hidden />
          </Button>
        </aside>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="surface-panel p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold">Needs attention</h2>
              <p className="mt-1 text-xs text-muted-foreground">Signals from across your workspace</p>
            </div>
            <Badge variant="outline" className="rounded-full text-[10px]">{view.rows.length} open</Badge>
          </div>
          <ul className="mt-4 space-y-2">
            {view.rows.map((row) => (
              <li key={row.title} className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-muted">
                <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${row.tone ?? "bg-primary-soft text-primary"}`}>
                  <ModuleIcon className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{row.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{row.detail}</span>
                </span>
                <Badge variant="outline" className="hidden shrink-0 rounded-full text-[10px] sm:inline-flex">{row.value}</Badge>
                <Icons.ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </li>
            ))}
          </ul>
        </section>

        <section className="surface-panel p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold">Progress snapshot</h2>
              <p className="mt-1 text-xs text-muted-foreground">How this area is tracking today</p>
            </div>
            <span className="grid size-9 place-items-center rounded-xl bg-primary-soft text-primary"><ModuleIcon className="size-4" aria-hidden /></span>
          </div>
          <div className="mt-5 space-y-5">
            {[
              ["Data completeness", 97],
              ["Team follow-through", 86],
              ["Goal progress", 74],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium">{label}</span>
                  <span className="text-xs font-semibold text-primary">{value}%</span>
                </div>
                <Progress value={Number(value)} className="mt-2 h-2" />
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center gap-3 rounded-xl bg-primary-soft/55 p-3">
            <div className="grid size-8 place-items-center rounded-lg bg-card text-primary"><Icons.Info className="size-4" aria-hidden /></div>
            <p className="text-xs leading-5 text-muted-foreground">Demo data is local to your browser. Changes and exports are simulated safely.</p>
          </div>
        </section>
      </div>
      <FloatingAI />
    </div>
  );
}
