import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import * as Icons from "lucide-react";
import { toast } from "sonner";
import { useAppState } from "@/app/providers/app-state";
import { ALL_NAV_ITEMS, type NavItem } from "@/config/navigation";
import { planAllows } from "@/config/plans";
import { ROLE_LABEL } from "@/config/roles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, FeatureLocked, PermissionDenied } from "@/components/feedback/states";
import { FloatingAI } from "@/components/feedback/floating-ai";
import {
  CONCEPTS,
  LEARNING_DEBT,
  PREDICTIONS,
  RISK_ALERTS,
  SCENARIOS,
  WORKLOAD_RECOMMENDATIONS,
  WORKLOAD_SIGNALS,
} from "@/data/mock/intelligence";
import {
  ADMISSIONS,
  FEE_RECORDS,
  INVENTORY_ITEMS,
  LIBRARY_ITEMS,
  TRANSPORT_ROUTES,
} from "@/data/mock/operations";
import { CONTEXT_ENTRIES, EXPERIMENTS, HELP_MATCHES, INTERVENTIONS } from "@/data/mock/support";
import { PersistedV1Workspace } from "@/components/v1/persisted-v1-workspace";
import {
  ACTIVITY_FEED,
  AI_RECOMMENDATIONS,
  AUDIT_LOGS,
  CALENDAR_EVENTS,
  DOCUMENTS,
  FUTURE_PRODUCTS,
  INTEGRATIONS,
  KNOWLEDGE_ANSWERS,
  MESSAGE_THREADS,
  REPORTS,
} from "@/data/mock/platform";

export const Route = createFileRoute("/app/$")({ component: ModuleWorkspace });

type WorkspaceRow = { title: string; meta: string; value: string; state?: string; detail?: string };
type WorkspaceData = {
  eyebrow: string;
  summary: string;
  icon: keyof typeof Icons;
  metrics: { label: string; value: string; tone: "primary" | "success" | "warning" | "ai" }[];
  rows: WorkspaceRow[];
  action: string;
  actionPath?: string;
  evidence?: boolean;
};

function ModuleWorkspace() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { role, plan, school } = useAppState();
  const item = ALL_NAV_ITEMS.find((i) => i.path === pathname);

  if (!item)
    return (
      <EmptyState
        title="Module not found"
        description={`No SHWAI module is mapped to ${pathname}. Use the command palette to jump to a module.`}
        icon={<Icons.CircleHelp className="size-6" aria-hidden />}
      />
    );
  if (!item.roles.includes(role)) return <PermissionDenied role={ROLE_LABEL[role]} />;
  if (item.plan && !planAllows(plan, item.plan))
    return <FeatureLocked required={item.plan} current={plan} />;
  if (
    ["/app/calendar", "/app/documents", "/app/leave", "/app/id-cards", "/app/alumni"].includes(
      pathname,
    )
  ) {
    return <PersistedV1Workspace pathname={pathname} item={item} />;
  }

  const data = buildWorkspaceData(item, school.name);
  const Icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[data.icon] ?? Icons.Database;

  return (
    <div className="relative space-y-6 pb-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
            <span className="size-1.5 rounded-full bg-primary" />
            SHWAI workspace
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-3xl font-extrabold tracking-tight">{item.label}</h1>
            {item.badge ? (
              <Badge className="rounded-full bg-ai-soft px-2.5 text-ai">{item.badge}</Badge>
            ) : null}
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{data.summary}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="rounded-full bg-card px-3 py-1 text-xs">
            {school.name}
          </Badge>
          <Badge variant="outline" className="rounded-full bg-card px-3 py-1 text-xs">
            Role: {ROLE_LABEL[role]}
          </Badge>
        </div>
      </header>

      {data.evidence ? (
        <div className="flex flex-wrap items-start gap-3 rounded-2xl border border-ai/20 bg-ai-soft/60 p-4 text-sm">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-ai text-ai-foreground">
            <Icons.ShieldCheck className="size-4" />
          </span>
          <div>
            <p className="font-semibold text-ai">Governed AI output</p>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">
              Evidence, confidence, uncertainty, missing-data and bias warnings remain visible.
              High-stakes recommendations require human review before an action is taken.
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="ml-auto">
            <Link to={"/app/ai/provenance" as never}>Open provenance</Link>
          </Button>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {data.metrics.map((metric) => (
          <Metric key={metric.label} {...metric} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.75fr]">
        <section className="surface-panel overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-5 sm:p-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                {data.eyebrow}
              </p>
              <h2 className="mt-1 text-xl font-bold tracking-tight">Live workspace records</h2>
            </div>
            <Badge className="rounded-full bg-muted text-muted-foreground">
              {data.rows.length} records
            </Badge>
          </div>
          <div className="divide-y divide-border">
            {data.rows.slice(0, 8).map((row) => (
              <div
                key={`${row.title}-${row.meta}`}
                className="flex flex-wrap items-center gap-3 p-4 transition-colors hover:bg-muted/30 sm:px-6"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-[180px] flex-1">
                  <p className="text-sm font-semibold">{row.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{row.meta}</p>
                  {row.detail ? (
                    <p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">
                      {row.detail}
                    </p>
                  ) : null}
                </div>
                <div className="ml-auto flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-bold tabular-nums">{row.value}</p>
                    {row.state ? (
                      <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
                        {row.state}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Open ${row.title}`}
                    onClick={() =>
                      toast.info(`${row.title} opened`, {
                        description:
                          "This demo action records the intended workflow without changing backend data.",
                      })
                    }
                  >
                    <Icons.ArrowUpRight className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="space-y-6">
          <section className="surface-panel p-5 sm:p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Recommended next step
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight">{data.action}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              SHWAI keeps the recommendation reviewable: inspect the record, confirm the owner, and
              record the outcome instead of applying an automatic decision.
            </p>
            <Button asChild className="mt-5 w-full">
              <Link to={(data.actionPath ?? item.path) as never}>
                Open workflow <Icons.ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </section>
          <section className="surface-panel p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-success-soft text-success">
                <Icons.CheckCircle2 className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">Access boundary active</p>
                <p className="text-xs text-muted-foreground">Tenant-isolated · role checked</p>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-xs leading-5 text-muted-foreground">
              <p>Actions are visible only to the roles configured for this module.</p>
              <p>AI outputs retain provenance and approval state alongside the record.</p>
              <p>Exports and changes are recorded in the audit log.</p>
            </div>
            <Button asChild variant="outline" size="sm" className="mt-4 w-full">
              <Link to={"/app/audit" as never}>View audit log</Link>
            </Button>
          </section>
        </aside>
      </div>
      <FloatingAI />
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "primary" | "success" | "warning" | "ai";
}) {
  const Icon =
    tone === "warning"
      ? Icons.TriangleAlert
      : tone === "success"
        ? Icons.CheckCircle2
        : tone === "ai"
          ? Icons.Sparkles
          : Icons.Activity;
  const toneClasses = {
    primary: "bg-primary-soft text-primary",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning-foreground",
    ai: "bg-ai-soft text-ai",
  };
  return (
    <div className="metric-panel p-4">
      <span className={`grid size-9 place-items-center rounded-xl ${toneClasses[tone]}`}>
        <Icon className="size-4" />
      </span>
      <p className="mt-4 text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tracking-tight text-numeric">{value}</p>
    </div>
  );
}

function buildWorkspaceData(item: NavItem, schoolName: string): WorkspaceData {
  const label = item.label;
  const base = {
    eyebrow: `${schoolName} · ${label}`,
    evidence:
      item.badge === "AI" ||
      label.includes("warning") ||
      label.includes("Prediction") ||
      label.includes("Simulator"),
  };
  if (label === "Early warning")
    return {
      ...base,
      summary:
        "Review attendance, homework, performance, engagement and dropout signals with evidence, uncertainty and a named human owner.",
      icon: "TriangleAlert",
      metrics: [
        {
          label: "Open alerts",
          value: String(RISK_ALERTS.filter((x) => x.status !== "resolved").length),
          tone: "warning",
        },
        {
          label: "Critical / high",
          value: String(RISK_ALERTS.filter((x) => x.riskScore >= 80).length),
          tone: "warning",
        },
        { label: "With evidence", value: "100%", tone: "ai" },
        { label: "Human review", value: "Required", tone: "success" },
      ],
      rows: RISK_ALERTS.map((x) => ({
        title: x.studentName,
        meta: `${x.classLabel} · ${x.riskType.replaceAll("-", " ")}`,
        value: `${x.riskScore}/100`,
        state: `${Math.round(x.confidence * 100)}% confidence`,
        detail: `${x.evidence[0]?.label}: ${x.evidence[0]?.value}. ${x.uncertainty}`,
      })),
      action: "Assign an intervention owner",
      actionPath: "/app/interventions",
    };
  if (label === "Concept intelligence")
    return {
      ...base,
      summary:
        "Map questions to concepts, inspect prerequisite gaps and turn class-wide misconception patterns into small-group plans and re-tests.",
      icon: "Network",
      metrics: [
        { label: "Concepts tracked", value: String(CONCEPTS.length), tone: "primary" },
        {
          label: "Below 55% mastery",
          value: String(CONCEPTS.filter((x) => x.masteryPct < 55).length),
          tone: "warning",
        },
        { label: "Misconceptions", value: "5", tone: "ai" },
        {
          label: "Retests planned",
          value: String(CONCEPTS.filter((x) => x.retestScheduled).length),
          tone: "success",
        },
      ],
      rows: CONCEPTS.map((x) => ({
        title: x.name,
        meta: `${x.subject} · Grade ${x.grade} · ${x.unit}`,
        value: `${x.masteryPct}%`,
        state: `${x.studentsStruggling} students struggling`,
        detail: x.misconceptions[0]?.statement ?? `Prerequisites: ${x.prerequisites.join(", ")}`,
      })),
      action: "Create a prerequisite revision block",
      actionPath: "/app/homework",
    };
  if (label === "Learning-debt map")
    return {
      ...base,
      summary:
        "See where topics are not taught on schedule, poorly understood, missing prerequisites or repeatedly misunderstood, then plan curriculum recovery.",
      icon: "LayoutGrid",
      metrics: [
        { label: "Debt items", value: String(LEARNING_DEBT.length), tone: "primary" },
        {
          label: "Severity 4–5",
          value: String(LEARNING_DEBT.filter((x) => x.severity >= 4).length),
          tone: "warning",
        },
        {
          label: "Students affected",
          value: String(LEARNING_DEBT.reduce((sum, x) => sum + x.studentsAffected, 0)),
          tone: "ai",
        },
        { label: "Next review", value: "Term 2", tone: "success" },
      ],
      rows: LEARNING_DEBT.map((x) => ({
        title: x.concept,
        meta: `${x.classLabel} · ${x.subject}`,
        value: `S${x.severity}`,
        state: `${x.studentsAffected} affected`,
        detail: x.recommendation,
      })),
      action: "Schedule school-wide revision",
      actionPath: "/app/timetable",
    };
  if (label === "Teacher workload")
    return {
      ...base,
      summary:
        "Balance grading, reporting, remedial, extracurricular and administrative work while keeping wellbeing indicators visible and non-punitive.",
      icon: "Gauge",
      metrics: [
        { label: "Teachers tracked", value: String(WORKLOAD_SIGNALS.length), tone: "primary" },
        {
          label: "Strained",
          value: String(WORKLOAD_SIGNALS.filter((x) => x.wellbeing === "strained").length),
          tone: "warning",
        },
        {
          label: "Hours saveable",
          value: `${WORKLOAD_RECOMMENDATIONS.reduce((s, x) => s + x.savingHours, 0)}h`,
          tone: "success",
        },
        { label: "Next-week index", value: "82", tone: "ai" },
      ],
      rows: WORKLOAD_SIGNALS.map((x) => ({
        title: x.teacher,
        meta: `${x.wellbeing} · ${x.teachingHours} teaching hrs`,
        value: `${x.predictedNextWeek}`,
        state: "predicted index",
        detail: `${x.gradingHours}h grading · ${x.adminHours}h admin · ${x.duplicateEntries} duplicate entries`,
      })),
      action: "Review workload recommendations",
      actionPath: "/app/workload",
    };
  if (label === "What-if simulator")
    return {
      ...base,
      summary:
        "Compare timetable, staffing, attendance, room and intervention scenarios with assumptions, risks, trade-offs and uncertainty ranges before adopting a decision.",
      icon: "SlidersHorizontal",
      metrics: [
        { label: "Saved scenarios", value: String(SCENARIOS.length), tone: "primary" },
        {
          label: "Simulated",
          value: String(SCENARIOS.filter((x) => x.status === "simulated").length),
          tone: "ai",
        },
        {
          label: "Adopted",
          value: String(SCENARIOS.filter((x) => x.status === "adopted").length),
          tone: "success",
        },
        { label: "Human decision", value: "Always", tone: "warning" },
      ],
      rows: SCENARIOS.map((x) => ({
        title: x.name,
        meta: `${x.category} · ${x.status}`,
        value: `${Math.round(x.confidence * 100)}%`,
        state: "confidence",
        detail: `${x.question} Risks: ${x.risks[0]}`,
      })),
      action: "Create a scenario",
      actionPath: "/app/simulator",
    };
  if (label === "Predictions")
    return {
      ...base,
      summary:
        "Inspect forecast values with confidence intervals and horizons. Predictions inform review; they never become automatic punishment, exclusion or permanent labels.",
      icon: "TrendingUp",
      metrics: [
        { label: "Forecasts", value: String(PREDICTIONS.length), tone: "primary" },
        {
          label: "Human review",
          value: String(PREDICTIONS.filter((x) => x.requiresHumanReview).length),
          tone: "warning",
        },
        {
          label: "Avg confidence",
          value: `${Math.round((PREDICTIONS.reduce((s, x) => s + x.confidence, 0) / PREDICTIONS.length) * 100)}%`,
          tone: "ai",
        },
        { label: "Intervals shown", value: "100%", tone: "success" },
      ],
      rows: PREDICTIONS.map((x) => ({
        title: x.metric,
        meta: `${x.subject} · ${x.scope}`,
        value: `${x.value} ${x.unit}`,
        state: `${Math.round(x.confidence * 100)}% confidence`,
        detail: `Range ${x.ciLow}–${x.ciHigh} ${x.unit} · horizon ${x.horizon}`,
      })),
      action: "Review a forecast with evidence",
      actionPath: "/app/ai/provenance",
    };
  if (label === "Interventions" || label === "Experiments") {
    const rows =
      label === "Interventions"
        ? INTERVENTIONS.map((x) => ({
            title: x.studentName,
            meta: `${x.classLabel} · ${x.type}`,
            value: x.status,
            state: x.parentAcknowledged ? "Parent acknowledged" : "Acknowledgement pending",
            detail: `${x.problem} Recommended: ${x.recommended}`,
          }))
        : EXPERIMENTS.map((x) => ({
            title: x.title,
            meta: `${x.metric} · ${x.status}`,
            value: x.successRate ? `${x.successRate}%` : "Pending",
            state: `Review ${x.reviewDate}`,
            detail: `${x.problem} Intervention: ${x.intervention}`,
          }));
    return {
      ...base,
      summary:
        label === "Interventions"
          ? "Track the problem, intervention, owner, follow-up date, escalation, parent acknowledgement and measured outcome for every support case."
          : "Run intervention experiments with a baseline, expected improvement, review date, outcome and evidence library.",
      icon: label === "Interventions" ? "LifeBuoy" : "FlaskConical",
      metrics: [
        {
          label: label === "Interventions" ? "Open cases" : "Experiments",
          value: String(rows.length),
          tone: "primary",
        },
        { label: "Follow-ups due", value: "4", tone: "warning" },
        { label: "Acknowledged", value: "75%", tone: "success" },
        { label: "Evidence linked", value: "100%", tone: "ai" },
      ],
      rows,
      action: label === "Interventions" ? "Assign a support owner" : "Review experiment evidence",
      actionPath: "/app/interventions",
    };
  }
  if (label === "Context passport")
    return {
      ...base,
      summary:
        "Keep consent-based context temporary, need-to-know and correctable. Expiry dates, access logs and parent/staff corrections are part of the record.",
      icon: "FileLock2",
      metrics: [
        { label: "Active entries", value: String(CONTEXT_ENTRIES.length), tone: "primary" },
        { label: "Expiring soon", value: "2", tone: "warning" },
        { label: "With consent", value: "100%", tone: "success" },
        { label: "Sensitive inference", value: "Blocked", tone: "ai" },
      ],
      rows: CONTEXT_ENTRIES.map((x) => ({
        title: x.studentName,
        meta: `${x.category.replaceAll("-", " ")} · ${x.source}`,
        value: x.expiresOn,
        state: `${x.visibleTo.length} roles`,
        detail: `${x.summary} Need-to-know access is logged.`,
      })),
      action: "Review consent and expiry",
      actionPath: "/app/privacy",
    };
  if (label === "Help network")
    return {
      ...base,
      summary:
        "Match students to peer tutors, office hours, remedial groups, verified resources and counsellor routing with age safety and non-humiliating support.",
      icon: "Handshake",
      metrics: [
        { label: "Suggested matches", value: String(HELP_MATCHES.length), tone: "primary" },
        {
          label: "Accepted",
          value: String(HELP_MATCHES.filter((x) => x.status === "accepted").length),
          tone: "success",
        },
        { label: "Languages", value: "4", tone: "ai" },
        { label: "Ranking style", value: "Private", tone: "warning" },
      ],
      rows: HELP_MATCHES.map((x) => ({
        title: x.studentName,
        meta: `${x.subject} · ${x.topic}`,
        value: x.matchType.replaceAll("-", " "),
        state: `${x.language} · ${x.slot}`,
        detail: `${x.matchName}. Status: ${x.status}.`,
      })),
      action: "Review a safe support match",
      actionPath: "/app/help-network",
    };
  if (label === "School intelligence")
    return {
      ...base,
      summary:
        "Combine performance trends, subject difficulty, homework insights, attendance prediction, resource utilisation and year comparisons in one leadership view.",
      icon: "ChartSpline",
      metrics: [
        { label: "Attendance", value: "93%", tone: "success" },
        { label: "Pass percentage", value: "97%", tone: "primary" },
        { label: "Homework", value: "84%", tone: "ai" },
        { label: "Campuses", value: "3", tone: "warning" },
      ],
      rows: ACTIVITY_FEED.map((x) => ({
        title: x.target,
        meta: x.actor,
        value: x.type,
        state: x.at,
        detail: `${x.actor} ${x.action} ${x.target}.`,
      })),
      action: "Compare academic years",
      actionPath: "/app/reports",
    };
  if (label === "Fees")
    return {
      ...base,
      summary:
        "Manage installments, scholarships, concessions, receipts, reminders, payment records and reconciliation within the school’s tenant boundary.",
      icon: "IndianRupee",
      metrics: [
        { label: "Records", value: String(FEE_RECORDS.length), tone: "primary" },
        {
          label: "Overdue",
          value: String(FEE_RECORDS.filter((x) => x.status === "overdue").length),
          tone: "warning",
        },
        {
          label: "Paid",
          value: String(FEE_RECORDS.filter((x) => x.status === "paid").length),
          tone: "success",
        },
        { label: "Reconciliation", value: "Ready", tone: "ai" },
      ],
      rows: FEE_RECORDS.map((x) => ({
        title: x.studentName,
        meta: `${x.classLabel} · ${x.term}`,
        value: `₹${x.total.toLocaleString("en-IN")}`,
        state: x.status,
        detail: `Paid ₹${x.paid.toLocaleString("en-IN")} · due ${x.dueDate}`,
      })),
      action: "Review outstanding fees",
      actionPath: "/app/reports",
    };
  if (label === "Admissions")
    return {
      ...base,
      summary:
        "Follow enquiries through applications, document verification, entrance tests, interviews, offers and enrolment with a reviewable AI fit signal.",
      icon: "UserPlus",
      metrics: [
        { label: "Pipeline", value: String(ADMISSIONS.length), tone: "primary" },
        {
          label: "Documents pending",
          value: String(ADMISSIONS.filter((x) => x.documentsVerified < x.documentsTotal).length),
          tone: "warning",
        },
        {
          label: "Offers",
          value: String(ADMISSIONS.filter((x) => x.stage === "offer").length),
          tone: "ai",
        },
        {
          label: "Enrolled",
          value: String(ADMISSIONS.filter((x) => x.stage === "enrolled").length),
          tone: "success",
        },
      ],
      rows: ADMISSIONS.map((x) => ({
        title: x.applicantName,
        meta: `Grade ${x.gradeApplied} · ${x.stage}`,
        value: `${Math.round(x.aiFitScore * 100)}%`,
        state: "AI fit signal",
        detail: `${x.documentsVerified}/${x.documentsTotal} documents verified · owner ${x.owner}`,
      })),
      action: "Review an application",
      actionPath: "/app/admissions",
    };
  if (label === "Transport")
    return {
      ...base,
      summary:
        "Coordinate routes, GPS status, pickup/drop confirmation and emergency alerts without exposing transport data beyond the intended role.",
      icon: "Bus",
      metrics: [
        { label: "Routes", value: String(TRANSPORT_ROUTES.length), tone: "primary" },
        {
          label: "On route",
          value: String(TRANSPORT_ROUTES.filter((x) => x.status === "on-route").length),
          tone: "success",
        },
        {
          label: "Delayed",
          value: String(TRANSPORT_ROUTES.filter((x) => x.status === "delayed").length),
          tone: "warning",
        },
        {
          label: "Students",
          value: String(TRANSPORT_ROUTES.reduce((s, x) => s + x.studentsCount, 0)),
          tone: "ai",
        },
      ],
      rows: TRANSPORT_ROUTES.map((x) => ({
        title: x.name,
        meta: `${x.busNo} · ${x.driver}`,
        value: x.status,
        state: `${x.studentsCount} students`,
        detail: `${x.gps.speedKmph} km/h · updated ${x.gps.updatedAt}`,
      })),
      action: "Review route status",
      actionPath: "/app/transport",
    };
  if (label === "Library")
    return {
      ...base,
      summary:
        "Search the library catalogue, see availability and track issues and returns for students and staff.",
      icon: "Library",
      metrics: [
        { label: "Titles", value: String(LIBRARY_ITEMS.length), tone: "primary" },
        {
          label: "Available copies",
          value: String(LIBRARY_ITEMS.reduce((s, x) => s + x.available, 0)),
          tone: "success",
        },
        {
          label: "Issued",
          value: String(LIBRARY_ITEMS.filter((x) => x.issuedTo).length),
          tone: "ai",
        },
        { label: "Due soon", value: "3", tone: "warning" },
      ],
      rows: LIBRARY_ITEMS.map((x) => ({
        title: x.title,
        meta: `${x.author} · ${x.category}`,
        value: `${x.available}/${x.copies}`,
        state: "available",
        detail: x.issuedTo
          ? `Issued to ${x.issuedTo} · due ${x.dueDate}`
          : "All copies currently on shelf.",
      })),
      action: "Open catalogue",
      actionPath: "/app/library",
    };
  if (label === "Documents" || label === "Knowledge base")
    return {
      ...base,
      summary:
        label === "Documents"
          ? "Store notes, syllabi, circulars, worksheets, forms, policies, report cards and certificates with role-aware visibility."
          : "Ask natural-language questions across approved school documents and inspect the sources supporting each answer.",
      icon: label === "Documents" ? "Folder" : "Search",
      metrics: [
        {
          label: label === "Documents" ? "Documents" : "Approved answers",
          value: String(label === "Documents" ? DOCUMENTS.length : KNOWLEDGE_ANSWERS.length),
          tone: "primary",
        },
        { label: "Role visibility", value: "Enforced", tone: "success" },
        { label: "Source links", value: "100%", tone: "ai" },
        { label: "Expiry workflow", value: "Enabled", tone: "warning" },
      ],
      rows:
        label === "Documents"
          ? DOCUMENTS.map((x) => ({
              title: x.name,
              meta: `${x.category} · ${x.fileType}`,
              value: `${x.sizeKb} KB`,
              state: `${x.visibleTo.length} roles`,
              detail: `${x.owner} · uploaded ${x.uploadedOn} · ${x.tags.join(", ")}`,
            }))
          : KNOWLEDGE_ANSWERS.map((x) => ({
              title: x.question,
              meta: "Approved knowledge source",
              value: `${x.sources.length} sources`,
              state: "Cited",
              detail: x.answer,
            })),
      action: label === "Documents" ? "Upload or review a document" : "Search approved sources",
      actionPath: "/app/knowledge-base",
    };
  if (label === "Audit logs" || label === "Security" || label === "Privacy & data")
    return {
      ...base,
      summary:
        "Make access, edit, export, deletion, consent, retention, encryption, backup and AI-decision controls visible to accountable administrators.",
      icon: label === "Audit logs" ? "ScrollText" : label === "Security" ? "Lock" : "FileKey",
      metrics: [
        { label: "Events logged", value: String(AUDIT_LOGS.length), tone: "primary" },
        {
          label: "AI decisions",
          value: String(AUDIT_LOGS.filter((x) => x.action === "ai-decision").length),
          tone: "ai",
        },
        { label: "Retention", value: "Configured", tone: "success" },
        { label: "Tenant isolation", value: "Active", tone: "warning" },
      ],
      rows: AUDIT_LOGS.slice(0, 12).map((x) => ({
        title: x.entity,
        meta: `${x.actor} · ${x.role}`,
        value: x.action,
        state: x.at,
        detail: `${x.detail} IP ${x.ip}`,
      })),
      action: "Review a control record",
      actionPath: label === "Audit logs" ? "/app/audit" : "/app/privacy",
    };
  if (label === "Reports")
    return {
      ...base,
      summary:
        "Run academic, attendance, teacher, student, school, operations and AI governance reports with scheduled ownership and export formats.",
      icon: "FileBarChart",
      metrics: [
        { label: "Definitions", value: String(REPORTS.length), tone: "primary" },
        {
          label: "Scheduled",
          value: String(REPORTS.filter((x) => x.schedule !== "manual").length),
          tone: "ai",
        },
        { label: "Export formats", value: "4", tone: "success" },
        { label: "Human review", value: "Required", tone: "warning" },
      ],
      rows: REPORTS.map((x) => ({
        title: x.name,
        meta: `${x.category} · ${x.schedule}`,
        value: x.requiredPlan,
        state: x.lastRun,
        detail: `${x.description} Formats: ${x.formats.join(", ")}`,
      })),
      action: "Run a governed report",
      actionPath: "/app/reports",
    };
  if (label === "Integrations")
    return {
      ...base,
      summary:
        "Connect academic, file, meeting and communication services while preserving consent, plan gates, delivery status and auditability.",
      icon: "Plug",
      metrics: [
        {
          label: "Connected",
          value: String(INTEGRATIONS.filter((x) => x.status === "connected").length),
          tone: "success",
        },
        {
          label: "Available",
          value: String(INTEGRATIONS.filter((x) => x.status === "available").length),
          tone: "primary",
        },
        { label: "Channels", value: "4", tone: "ai" },
        { label: "Sync review", value: "Enabled", tone: "warning" },
      ],
      rows: INTEGRATIONS.map((x) => ({
        title: x.name,
        meta: `${x.category} · ${x.requiredPlan}`,
        value: x.status,
        state: x.connectedOn ?? "Not connected",
        detail: x.description,
      })),
      action: "Review integration permissions",
      actionPath: "/app/integrations",
    };
  if (label === "Future products")
    return {
      ...base,
      summary:
        "Keep future products visible as roadmap previews without exposing later-version functionality in earlier plan surfaces.",
      icon: "Rocket",
      metrics: [
        { label: "Roadmap items", value: String(FUTURE_PRODUCTS.length), tone: "primary" },
        {
          label: "Preview",
          value: String(FUTURE_PRODUCTS.filter((x) => x.stage === "preview").length),
          tone: "ai",
        },
        {
          label: "In design",
          value: String(FUTURE_PRODUCTS.filter((x) => x.stage === "in-design").length),
          tone: "warning",
        },
        {
          label: "Planned",
          value: String(FUTURE_PRODUCTS.filter((x) => x.stage === "planned").length),
          tone: "success",
        },
      ],
      rows: FUTURE_PRODUCTS.map((x) => ({
        title: x.name,
        meta: `${x.category} · ${x.stage}`,
        value: x.eta,
        state: "Roadmap",
        detail: x.description,
      })),
      action: "Review the version dependency map",
      actionPath: "/app/subscription",
    };
  if (
    label === "Communication" ||
    label === "Announcements" ||
    label === "Live classes" ||
    label === "Chat"
  )
    return {
      ...base,
      summary:
        "Coordinate announcements, direct messages, emergency communication and live-class workflows with channel, language and audience visibility.",
      icon: label === "Chat" ? "MessageCircle" : "Send",
      metrics: [
        { label: "Threads", value: String(MESSAGE_THREADS.length), tone: "primary" },
        {
          label: "Unread",
          value: String(MESSAGE_THREADS.reduce((s, x) => s + x.unread, 0)),
          tone: "warning",
        },
        { label: "Languages", value: "4", tone: "ai" },
        { label: "Channels", value: "4", tone: "success" },
      ],
      rows: MESSAGE_THREADS.map((x) => ({
        title: x.subject,
        meta: `${x.channel} · ${x.language}`,
        value: String(x.unread),
        state: "unread",
        detail: `${x.participants.join(", ")} · last activity ${x.lastMessageAt}`,
      })),
      action: "Review audience and delivery",
      actionPath: "/app/communication",
    };
  if (label === "Calendar")
    return {
      ...base,
      summary:
        "Manage school calendar events, holidays, examinations, PTMs, sports day, annual functions and assignment deadlines in one visible schedule.",
      icon: "CalendarDays",
      metrics: [
        { label: "Events", value: String(CALENDAR_EVENTS.length), tone: "primary" },
        {
          label: "Exams",
          value: String(CALENDAR_EVENTS.filter((x) => x.type === "exam").length),
          tone: "warning",
        },
        { label: "Family events", value: "2", tone: "success" },
        { label: "Sync status", value: "Ready", tone: "ai" },
      ],
      rows: CALENDAR_EVENTS.map((x) => ({
        title: x.title,
        meta: `${x.type} · ${x.audience.join(", ")}`,
        value: x.date,
        state: x.location ?? "School calendar",
        detail: x.endDate ? `Ends ${x.endDate}` : undefined,
      })),
      action: "Open the full calendar",
      actionPath: "/app/calendar",
    };
  if (label === "Inventory & facilities")
    return {
      ...base,
      summary:
        "Track inventory, classrooms, facilities, certificates and resource availability as part of enterprise school operations.",
      icon: "Package",
      metrics: [
        { label: "Items", value: String(INVENTORY_ITEMS.length), tone: "primary" },
        {
          label: "Reorder flags",
          value: String(INVENTORY_ITEMS.filter((x) => x.quantity <= x.reorderLevel).length),
          tone: "warning",
        },
        { label: "Locations", value: "6", tone: "success" },
        { label: "Certificates", value: "Ready", tone: "ai" },
      ],
      rows: INVENTORY_ITEMS.map((x) => ({
        title: x.name,
        meta: `${x.category} · ${x.location}`,
        value: String(x.quantity),
        state: `reorder at ${x.reorderLevel}`,
        detail: `Unit cost ₹${x.unitCost.toLocaleString("en-IN")}`,
      })),
      action: "Review facilities and reorder flags",
      actionPath: "/app/facilities",
    };
  return {
    ...base,
    summary: item.description,
    icon: item.icon as keyof typeof Icons,
    metrics: [
      { label: "Scope mapped", value: "Ready", tone: "primary" },
      { label: "Role access", value: "Checked", tone: "success" },
      { label: "Plan gate", value: item.plan ?? "Starter", tone: "ai" },
      { label: "Next step", value: "Review", tone: "warning" },
    ],
    rows: [
      {
        title: item.label,
        meta: "SHWAI capability",
        value: "Mapped",
        state: "Workflow-ready",
        detail: item.description,
      },
      {
        title: "Version boundary",
        meta: "Master prompt",
        value: item.plan ? item.plan : "V1–V2",
        state: "Preserved",
        detail: "Later-version functionality is not exposed through an earlier plan gate.",
      },
    ],
    action: "Open this workflow",
    actionPath: item.path,
  };
}
