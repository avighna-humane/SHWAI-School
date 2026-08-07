import { createFileRoute } from "@tanstack/react-router";
import * as Icons from "lucide-react";
import { useAppState } from "@/app/providers/app-state";
import { ACTIVITY_FEED, AI_RECOMMENDATIONS, CALENDAR_EVENTS, NOTIFICATIONS } from "@/data/mock/platform";
import { ATTENDANCE_TREND, ASSIGNMENTS, EXAMS } from "@/data/mock/academics";
import { SCHOOL_TRENDS, RISK_ALERTS } from "@/data/mock/intelligence";
import { INTERVENTIONS } from "@/data/mock/support";
import { FEE_COLLECTION_TREND, TRANSPORT_ROUTES } from "@/data/mock/operations";
import { ROLE_LABEL } from "@/config/roles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

export const Route = createFileRoute("/app/")({ component: Dashboard });

const METRICS: Record<string, { label: string; value: string; delta: string; icon: keyof typeof Icons }[]> = {
  student: [
    { label: "My attendance", value: "92%", delta: "+2% this month", icon: "UserCheck" },
    { label: "Homework pending", value: "3", delta: "1 due tomorrow", icon: "NotebookPen" },
    { label: "Average score", value: "74%", delta: "+6 marks vs UT1", icon: "ClipboardCheck" },
    { label: "Learning streak", value: "14 days", delta: "Level 8 · 3,240 XP", icon: "Flame" },
  ],
  teacher: [
    { label: "Grading backlog", value: "42", delta: "Down from 61", icon: "ClipboardCheck" },
    { label: "Attendance pending", value: "1 class", delta: "Grade 9 — A, Period 3", icon: "UserCheck" },
    { label: "Students at risk", value: "5", delta: "2 need intervention", icon: "TriangleAlert" },
    { label: "Workload index", value: "78", delta: "Watch — 3 assessments this week", icon: "Gauge" },
  ],
  parent: [
    { label: "Ward attendance", value: "92%", delta: "Aarav · Grade 9 — A", icon: "UserCheck" },
    { label: "Homework completion", value: "84%", delta: "3 pending this week", icon: "NotebookPen" },
    { label: "Fees due", value: "₹18,240", delta: "Installment 2 · due 10/12", icon: "IndianRupee" },
    { label: "Bus status", value: "On route", delta: "Route 4 · 12 min delay", icon: "Bus" },
  ],
  admin: [
    { label: "Attendance today", value: "93.4%", delta: "1,199 of 1,284 present", icon: "UserCheck" },
    { label: "Fee collection", value: "₹42.6L", delta: "88% of Installment 2", icon: "IndianRupee" },
    { label: "Open interventions", value: "18", delta: "4 follow-ups due", icon: "LifeBuoy" },
    { label: "Admissions in pipeline", value: "14", delta: "3 offers pending", icon: "UserPlus" },
  ],
  principal: [
    { label: "School performance", value: "74%", delta: "+3 vs last term", icon: "ChartSpline" },
    { label: "Students at risk", value: "22", delta: "6 critical", icon: "TriangleAlert" },
    { label: "Teachers strained", value: "3", delta: "Workload above 85 for 3 weeks", icon: "Gauge" },
    { label: "Learning debt items", value: "30", delta: "8 at severity 4+", icon: "LayoutGrid" },
  ],
  owner: [
    { label: "Students (all campuses)", value: "2,686", delta: "+184 this year", icon: "GraduationCap" },
    { label: "Annual revenue", value: "₹2.87Cr", delta: "Collection at 91%", icon: "IndianRupee" },
    { label: "Plan", value: "Enterprise AI", delta: "1,284 of 1,500 licences used", icon: "BadgeCheck" },
    { label: "Campuses", value: "3", delta: "Nashik onboarding at 74%", icon: "Building2" },
  ],
};

function Dashboard() {
  const { role, user, school, year, plan } = useAppState();
  const metrics = METRICS[role] ?? METRICS.admin!;
  const recs = AI_RECOMMENDATIONS.filter((r) => r.audience.includes(role)).slice(0, 3);
  const alerts = NOTIFICATIONS.filter((n) => n.roles.includes(role)).slice(0, 4);

  return (
    <div className="space-y-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">{ROLE_LABEL[role]} dashboard</p>
          <h1 className="mt-1 truncate text-2xl font-bold tracking-tight">Good morning, {user.name.split(" ")[0]}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {school.name} · {school.board} · Academic year {year.label} · {plan === "enterprise" ? "Enterprise AI" : plan} plan
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => toast.success("Export queued — mock CSV ready")}>
            <Icons.Download className="size-4" aria-hidden /> Export
          </Button>
          <Button size="sm" onClick={() => toast.success("Quick action recorded in this demo")}>
            <Icons.Plus className="size-4" aria-hidden /> Quick action
          </Button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Key metrics">
        {metrics.map((m) => {
          const I = (Icons as unknown as Record<string, Icons.LucideIcon>)[m.icon] ?? Icons.Circle;
          return (
            <article key={m.label} className="surface-panel p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">{m.label}</p>
                <I className="size-4 text-primary" aria-hidden />
              </div>
              <p className="mt-3 text-2xl font-bold text-numeric">{m.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{m.delta}</p>
            </article>
          );
        })}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="surface-panel p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold">
            {role === "student" || role === "parent" ? "Attendance & homework trend" : "School performance trend"}
          </h2>
          <p className="text-xs text-muted-foreground">Last six months · mock data</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              {role === "owner" ? (
                <AreaChart data={FEE_COLLECTION_TREND}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${Math.round(Number(v) / 100000)}L`} />
                  <RTooltip formatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`} />
                  <Legend />
                  <Area name="Collected" dataKey="collected" stroke="var(--color-chart-1)" fill="var(--color-primary-soft)" />
                  <Area name="Outstanding" dataKey="outstanding" stroke="var(--color-chart-3)" fill="var(--color-warning-soft)" />
                </AreaChart>
              ) : role === "student" || role === "parent" ? (
                <LineChart data={ATTENDANCE_TREND}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <RTooltip />
                  <Legend />
                  <Line name="Present %" dataKey="present" stroke="var(--color-chart-1)" strokeWidth={2} />
                  <Line name="Late %" dataKey="late" stroke="var(--color-chart-3)" strokeWidth={2} />
                </LineChart>
              ) : (
                <LineChart data={SCHOOL_TRENDS}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <RTooltip />
                  <Legend />
                  <Line name="Performance %" dataKey="performance" stroke="var(--color-chart-1)" strokeWidth={2} />
                  <Line name="Attendance %" dataKey="attendance" stroke="var(--color-chart-2)" strokeWidth={2} />
                  <Line name="Homework %" dataKey="homework" stroke="var(--color-chart-4)" strokeWidth={2} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </section>

        <section className="surface-panel p-5">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold">
            <Icons.Sparkles className="size-4 text-ai" aria-hidden /> AI insights
          </h2>
          <ul className="mt-3 space-y-3">
            {recs.length === 0 && <li className="text-sm text-muted-foreground">No AI insights for this role today.</li>}
            {recs.map((r) => (
              <li key={r.id} className="rounded-lg border border-border bg-ai-soft/40 p-3">
                <p className="text-sm font-semibold">{r.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{r.body}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">Confidence {Math.round(r.confidence * 100)}%</Badge>
                  <Badge variant="outline" className="text-[10px] capitalize">{r.impact} impact</Badge>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="surface-panel p-5">
          <h2 className="text-sm font-semibold">Needs attention</h2>
          <ul className="mt-3 space-y-3">
            {alerts.map((a) => (
              <li key={a.id} className="flex gap-2.5">
                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${a.severity === "critical" ? "bg-danger" : a.severity === "warning" ? "bg-warning" : "bg-primary"}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{a.createdAt}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="surface-panel p-5">
          <h2 className="text-sm font-semibold">Recent activity</h2>
          <ul className="mt-3 space-y-3">
            {ACTIVITY_FEED.slice(0, 5).map((a) => (
              <li key={a.id} className="text-sm">
                <span className="font-medium">{a.actor}</span>{" "}
                <span className="text-muted-foreground">{a.action}</span> <span className="font-medium">{a.target}</span>
                <span className="block text-xs text-muted-foreground">{a.at}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="surface-panel p-5">
          <h2 className="text-sm font-semibold">Upcoming</h2>
          <ul className="mt-3 space-y-3">
            {CALENDAR_EVENTS.slice(0, 5).map((e) => (
              <li key={e.id} className="flex items-start gap-2.5 text-sm">
                <Icons.CalendarDays className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{e.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {e.date}
                    {e.endDate ? ` – ${e.endDate}` : ""} · {e.audience.join(", ")}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="surface-panel p-5">
          <h2 className="text-sm font-semibold">Summaries</h2>
          <dl className="mt-3 space-y-3 text-sm">
            {[
              ["Attendance", "93.4% today", 93],
              ["Homework completion", `${ASSIGNMENTS.length} active assignments · 84% on time`, 84],
              ["Examinations", `${EXAMS.filter((e) => e.status !== "published").length} in progress or scheduled`, 62],
              ["Interventions", `${INTERVENTIONS.filter((i) => i.status !== "completed").length} open cases`, 48],
              ["Transport", `${TRANSPORT_ROUTES.filter((r) => r.status === "on-route").length} routes on the road`, 71],
            ].map(([label, detail, pct]) => (
              <div key={String(label)}>
                <div className="flex items-center justify-between gap-3">
                  <dt className="font-medium">{label}</dt>
                  <dd className="text-xs text-muted-foreground">{detail}</dd>
                </div>
                <Progress value={Number(pct)} className="mt-1.5 h-1.5" />
              </div>
            ))}
          </dl>
        </section>

        <section className="surface-panel p-5">
          <h2 className="text-sm font-semibold">Risk watchlist</h2>
          <ul className="mt-3 divide-y divide-border">
            {RISK_ALERTS.slice(0, 5).map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-2.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-danger-soft text-[10px] font-bold text-danger">
                  {a.riskScore}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{a.studentName}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {a.classLabel} · {a.riskType.replace("-", " ")}
                  </span>
                </span>
                <Badge variant="outline" className="shrink-0 text-[10px]">{Math.round(a.confidence * 100)}%</Badge>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
