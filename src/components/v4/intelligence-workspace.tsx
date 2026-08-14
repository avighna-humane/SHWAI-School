import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Icons from "lucide-react";
import {
  acknowledgeIntelligenceAlert,
  askLeadershipAssistant,
  createIntervention,
  getIntelligenceAlertDetail,
  getIntelligenceOverview,
  getIntelligenceReport,
  getInterventionFollowups,
  listIntelligenceAlerts,
  listInterventions,
  listConceptMap,
  recordInterventionOutcome,
  runIntelligenceScan,
  scheduleInterventionFollowup,
  updateIntervention,
} from "@/actions/intelligence";
import { useAppState } from "@/app/providers/app-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type IntelligenceView =
  "early-warning" | "concepts" | "school" | "assistant" | "interventions";

type Alert = {
  id: string;
  student_id: string;
  student_name: string;
  alert_type: string;
  title: string;
  summary: string;
  severity: "info" | "attention" | "urgent";
  confidence: string;
  confidence_reason: string;
  observation_start: string;
  observation_end: string;
  status: string;
  owner_id: string | null;
  created_at: string;
};
type InterventionStatus =
  | "new"
  | "reviewed"
  | "assigned"
  | "in_progress"
  | "follow_up"
  | "completed"
  | "outcome_measured"
  | "cancelled";
type InterventionActionMutation = {
  mutate: (data: { id: string; status: InterventionStatus; notes?: string }) => void;
};
type StringActionMutation = { mutate: (id: string) => void };
type Intervention = {
  id: string;
  alert_id: string | null;
  student_id: string;
  student_name: string;
  issue: string;
  evidence: string;
  recommended_action: string;
  owner_id: string | null;
  priority: "low" | "medium" | "high";
  status: string;
  notes: string;
  target_date: string | null;
  follow_up_date: string | null;
  created_at: string;
  updated_at: string;
};
type Overview = {
  role: string;
  privacy: string;
  alerts?: Array<{ severity: string; status: string; count: number }>;
  signals?: Array<{ category: string; count: number }>;
  interventions?: Array<{ status: string; count: number }>;
  followups?: Array<{ status: string; count: number }>;
  latestRun?: Array<Record<string, unknown>>;
  performance?: Array<{ subject: string; average_percentage: number; records: number }>;
  grades?: Array<Record<string, unknown>>;
  activity?: Array<Record<string, unknown>>;
  attendance?: Array<{
    records: number;
    attendance_percentage: number | null;
    late_records: number;
  }>;
  homework?: Array<{ assigned: number; completed: number; late_submissions: number }>;
  aiUsage?: Array<{ requests: number; active_users: number; failures: number; features: number }>;
};

function ErrorNotice({ error }: { error: unknown }) {
  if (!error) return null;
  const message = error instanceof Error ? error.message : String(error);
  const config = /configuration|provider|BUILT_IN_FORGE/i.test(message);
  return (
    <div
      className={`rounded-xl border p-4 text-sm ${config ? "border-warning/30 bg-warning/5 text-warning" : "border-danger/30 bg-danger/5 text-danger"}`}
    >
      <div className="flex items-start gap-2">
        {config ? (
          <Icons.Settings2 className="mt-0.5 size-4 shrink-0" />
        ) : (
          <Icons.TriangleAlert className="mt-0.5 size-4 shrink-0" />
        )}
        <div>
          <p className="font-semibold">
            {config ? "AI/provider configuration required" : "Intelligence request failed"}
          </p>
          <p className="mt-1 leading-5">{message}</p>
        </div>
      </div>
    </div>
  );
}

const titles: Record<IntelligenceView, { label: string; summary: string; icon: Icons.LucideIcon }> =
  {
    "early-warning": {
      label: "Early warning",
      summary:
        "Review observable attendance, homework, performance, engagement, and repeated-difficulty signals with evidence and data quality.",
      icon: Icons.TriangleAlert,
    },
    concepts: {
      label: "Concept intelligence",
      summary:
        "Identify repeated concept difficulty from actual practice attempts, hint usage, and success rates without making future predictions.",
      icon: Icons.Network,
    },
    school: {
      label: "School intelligence",
      summary:
        "Inspect school-scoped observed trends, alert volume, intervention status, and the latest evidence-backed intelligence run.",
      icon: Icons.ChartSpline,
    },
    assistant: {
      label: "Leadership assistant",
      summary:
        "Ask a leadership question over aggregate school intelligence. The assistant cannot access unrestricted student records or make automatic decisions.",
      icon: Icons.MessagesSquare,
    },
    interventions: {
      label: "Interventions",
      summary:
        "Assign human-owned support, schedule follow-ups, update status, and record before/after outcomes without declaring causality.",
      icon: Icons.LifeBuoy,
    },
  };

export function IntelligenceWorkspace({ view }: { view: IntelligenceView }) {
  const { school, role } = useAppState();
  const queryClient = useQueryClient();
  const meta = titles[view];
  const [windowDays, setWindowDays] = useState<7 | 14 | 30 | 90>(30);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [question, setQuestion] = useState("");
  const [assistantAnswer, setAssistantAnswer] = useState<string | null>(null);
  const [interventionId, setInterventionId] = useState<string | null>(null);
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const overviewQuery = useQuery({
    queryKey: ["v4-intelligence-overview", role],
    queryFn: () => getIntelligenceOverview(),
  });
  const alertsQuery = useQuery({
    queryKey: ["v4-intelligence-alerts"],
    queryFn: () => listIntelligenceAlerts(),
    enabled: role !== "student" && role !== "parent",
  });
  const interventionsQuery = useQuery({
    queryKey: ["v4-interventions"],
    queryFn: () => listInterventions(),
    enabled: role !== "student" && role !== "parent",
  });
  const followupsQuery = useQuery({
    queryKey: ["v4-followups"],
    queryFn: () => getInterventionFollowups(),
    enabled: role !== "student" && role !== "parent",
  });
  const detailQuery = useQuery({
    queryKey: ["v4-alert-detail", selectedAlert?.id],
    queryFn: () => getIntelligenceAlertDetail({ data: { id: selectedAlert!.id } }),
    enabled: Boolean(selectedAlert),
  });
  const reportQuery = useQuery({
    queryKey: ["v4-report"],
    queryFn: () => getIntelligenceReport(),
    enabled: view === "school" && ["principal", "admin", "owner"].includes(role),
  });
  const conceptMapQuery = useQuery({
    queryKey: ["v4-concept-map"],
    queryFn: () => listConceptMap(),
    enabled: view === "concepts" && role !== "student" && role !== "parent",
  });

  const scanMutation = useMutation({
    mutationFn: () => runIntelligenceScan({ data: { windowDays } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["v4-intelligence-overview"] });
      void queryClient.invalidateQueries({ queryKey: ["v4-intelligence-alerts"] });
      void queryClient.invalidateQueries({ queryKey: ["v4-report"] });
    },
  });
  const acknowledgeMutation = useMutation({
    mutationFn: (id: string) => acknowledgeIntelligenceAlert({ data: { id } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["v4-intelligence-alerts"] });
    },
  });
  const assistantMutation = useMutation({
    mutationFn: () => askLeadershipAssistant({ data: { question, windowDays } }),
    onSuccess: (result) => setAssistantAnswer(result.answer),
  });
  const updateMutation = useMutation({
    mutationFn: (data: {
      id: string;
      status:
        | "new"
        | "reviewed"
        | "assigned"
        | "in_progress"
        | "follow_up"
        | "completed"
        | "outcome_measured"
        | "cancelled";
      notes?: string;
    }) => updateIntervention({ data }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["v4-interventions"] });
      void queryClient.invalidateQueries({ queryKey: ["v4-followups"] });
    },
  });
  const createMutation = useMutation({
    mutationFn: (alert: Alert) =>
      createIntervention({
        data: {
          alertId: alert.id,
          studentId: alert.student_id,
          issue: alert.title,
          evidence: alert.summary,
          recommendedAction:
            "Review the alert evidence with the responsible teacher and agree a human-owned support action.",
          priority: alert.severity === "urgent" ? "high" : "medium",
        },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["v4-interventions"] });
      void queryClient.invalidateQueries({ queryKey: ["v4-intelligence-alerts"] });
    },
  });
  const followupMutation = useMutation({
    mutationFn: (id: string) =>
      scheduleInterventionFollowup({
        data: {
          interventionId: id,
          scheduledFor: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
          notes: "Scheduled from V4 intervention workspace",
        },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["v4-followups"] });
      void queryClient.invalidateQueries({ queryKey: ["v4-interventions"] });
    },
  });
  const outcomeMutation = useMutation({
    mutationFn: (id: string) =>
      recordInterventionOutcome({
        data: {
          interventionId: id,
          measuredAt: new Date().toISOString().slice(0, 10),
          metricName: "Human follow-up observation",
          outcome: "insufficient_data",
          notes: outcomeNotes || "Not enough evidence for a causal outcome claim.",
        },
      }),
    onSuccess: () => {
      setOutcomeNotes("");
      void queryClient.invalidateQueries({ queryKey: ["v4-interventions"] });
    },
  });

  const overview = overviewQuery.data as unknown as Overview | undefined;
  const alerts = (alertsQuery.data ?? []) as unknown as Alert[];
  const interventions = (interventionsQuery.data ?? []) as unknown as Intervention[];
  const conceptAlerts = alerts.filter(
    (alert) => alert.alert_type === "repeated_concept_difficulty",
  );
  const visibleAlerts = view === "concepts" ? conceptAlerts : alerts;
  const selectedDetail = detailQuery.data as unknown as
    | {
        evidence?: Array<{ id: string; label: string; value: string; detail: string }>;
        recommendations?: Array<{
          id: string;
          action: string;
          rationale: string;
          priority: string;
          status: string;
        }>;
      }
    | undefined;

  const submitAssistant = (event: React.FormEvent) => {
    event.preventDefault();
    if (question.trim()) assistantMutation.mutate();
  };

  return (
    <div className="space-y-6 pb-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
            <span className="size-1.5 rounded-full bg-primary" /> V4 intelligence and automation
          </p>
          <div className="flex items-center gap-3">
            <meta.icon className="size-7 text-primary" />
            <h1 className="text-3xl font-extrabold tracking-tight">{meta.label}</h1>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{meta.summary}</p>
        </div>
        <Badge variant="outline" className="rounded-full bg-card px-3 py-1">
          {school.name} · {role}
        </Badge>
      </header>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-ai/20 bg-ai-soft/25 p-4 text-sm">
        <Icons.ShieldCheck className="size-4 text-ai" />
        <span className="text-muted-foreground">
          <strong className="text-foreground">Evidence boundary:</strong> V4 uses persisted
          observations, states data quality, and requires a human owner before sensitive action.
        </span>
      </div>

      {view === "assistant" ? (
        <section className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
          <form onSubmit={submitAssistant} className="surface-panel space-y-4 p-5 sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Aggregate school query
            </p>
            <label className="block text-sm font-medium">
              Question
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                rows={5}
                placeholder="Which subjects have the lowest published average in the selected window?"
                className="mt-1.5 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm font-medium">
              Observation window
              <select
                value={windowDays}
                onChange={(event) => setWindowDays(Number(event.target.value) as 7 | 14 | 30 | 90)}
                className="mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
              >
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
              </select>
            </label>
            <Button type="submit" disabled={assistantMutation.isPending || !question.trim()}>
              <Icons.MessagesSquare className="mr-2 size-4" />
              {assistantMutation.isPending ? "Reviewing evidence…" : "Ask leadership assistant"}
            </Button>
            <ErrorNotice error={assistantMutation.error} />
          </form>
          <section className="surface-panel min-h-60 p-5 sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Answer boundary
            </p>
            {assistantAnswer ? (
              <div className="mt-4 space-y-3">
                <Badge className="rounded-full bg-ai-soft text-ai">
                  AI-generated explanation · Aggregate evidence only
                </Badge>
                <p className="whitespace-pre-wrap text-sm leading-7">{assistantAnswer}</p>
              </div>
            ) : (
              <div className="mt-6 text-center text-sm text-muted-foreground">
                <Icons.SearchCheck className="mx-auto size-8 opacity-40" />
                <p className="mt-3">Ask a question to receive an evidence-scoped answer.</p>
              </div>
            )}
          </section>
        </section>
      ) : null}

      {view === "school" ? (
        <SchoolPanel
          overview={overview}
          report={
            reportQuery.data as unknown as
              | {
                  generatedFrom?: Record<string, unknown> | null;
                  alerts?: Array<{ severity: string; count: number }>;
                  interventions?: Array<{ status: string; count: number }>;
                }
              | undefined
          }
        />
      ) : null}

      {view === "concepts" ? (
        <ConceptMap
          map={
            conceptMapQuery.data as unknown as
              | Array<{
                  id: string;
                  concept_key: string;
                  label: string;
                  subject: string;
                  prerequisite_id: string | null;
                  prerequisite_label: string | null;
                }>
              | undefined
          }
        />
      ) : null}

      {view === "early-warning" || view === "concepts" ? (
        <section className="space-y-5">
          <div className="surface-panel flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Deterministic scan
              </p>
              <h2 className="mt-1 text-xl font-bold">Observe the current school data</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                The scan compares two equal windows and skips signals with insufficient evidence.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={windowDays}
                onChange={(event) => setWindowDays(Number(event.target.value) as 7 | 14 | 30 | 90)}
                className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
              >
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
              </select>
              <Button onClick={() => scanMutation.mutate()} disabled={scanMutation.isPending}>
                {scanMutation.isPending ? "Scanning…" : "Run intelligence scan"}
              </Button>
            </div>
            {scanMutation.data ? (
              <p className="w-full text-xs text-success">
                Scan completed: {scanMutation.data.signalsCreated} signals and{" "}
                {scanMutation.data.alertsCreated} new alerts from{" "}
                {scanMutation.data.recordsExamined} records.
              </p>
            ) : null}
            <ErrorNotice error={scanMutation.error} />
          </div>
          <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <section className="surface-panel overflow-hidden">
              <div className="flex items-center justify-between border-b border-border p-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    Open evidence-backed alerts
                  </p>
                  <h2 className="mt-1 text-xl font-bold">
                    {view === "concepts"
                      ? "Repeated concept difficulty"
                      : "Observed academic signals"}
                  </h2>
                </div>
                <Badge variant="outline" className="rounded-full">
                  {visibleAlerts.length}
                </Badge>
              </div>
              <div className="divide-y divide-border">
                {alertsQuery.isLoading ? (
                  <p className="p-5 text-sm text-muted-foreground">Loading persisted alerts…</p>
                ) : alertsQuery.isError ? (
                  <div className="p-5">
                    <ErrorNotice error={alertsQuery.error} />
                  </div>
                ) : (
                  visibleAlerts.map((alert) => (
                    <button
                      type="button"
                      key={alert.id}
                      onClick={() => setSelectedAlert(alert)}
                      className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-muted/30"
                    >
                      <span
                        className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl ${alert.severity === "urgent" ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning-foreground"}`}
                      >
                        <Icons.TriangleAlert className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold">
                            {alert.student_name} · {alert.title}
                          </span>
                          <Badge className="rounded-full bg-muted text-muted-foreground">
                            {alert.confidence}
                          </Badge>
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                          {alert.summary}
                        </span>
                        <span className="mt-1 block text-[11px] text-muted-foreground">
                          {alert.observation_start} – {alert.observation_end} · {alert.status}
                        </span>
                      </span>
                      <Icons.ChevronRight className="mt-1 size-4 text-muted-foreground" />
                    </button>
                  ))
                )}
                {!visibleAlerts.length && !alertsQuery.isLoading ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    <Icons.CheckCircle2 className="mx-auto size-8 text-success/70" />
                    <p className="mt-3">No evidence-backed alerts are currently open.</p>
                    <p className="mt-1 text-xs">Run a scan after V1–V3 data has accumulated.</p>
                  </div>
                ) : null}
              </div>
            </section>
            <section className="surface-panel p-5 sm:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Selected alert
              </p>
              {selectedAlert ? (
                <div className="mt-4 space-y-4">
                  <div>
                    <h2 className="text-xl font-bold">
                      {selectedAlert.student_name} · {selectedAlert.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6">{selectedAlert.summary}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/25 p-3 text-xs text-muted-foreground">
                    <strong className="text-foreground">Confidence:</strong>{" "}
                    {selectedAlert.confidence}. {selectedAlert.confidence_reason}
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      Evidence
                    </p>
                    <div className="mt-2 space-y-2">
                      {selectedDetail?.evidence?.map((item) => (
                        <div key={item.id} className="rounded-lg border border-border p-3">
                          <p className="text-sm font-semibold">
                            {item.label} · {item.value}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            {item.detail}
                          </p>
                        </div>
                      )) ?? <p className="text-sm text-muted-foreground">Loading evidence…</p>}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      Recommended human action
                    </p>
                    {selectedDetail?.recommendations?.map((item) => (
                      <div
                        key={item.id}
                        className="mt-2 rounded-lg border border-ai/20 bg-ai-soft/20 p-3"
                      >
                        <p className="text-sm font-semibold">{item.action}</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {item.rationale}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2"
                          onClick={() => createMutation.mutate(selectedAlert)}
                        >
                          Create intervention
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => acknowledgeMutation.mutate(selectedAlert.id)}
                      disabled={acknowledgeMutation.isPending}
                    >
                      Acknowledge
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedAlert(null)}>
                      Close
                    </Button>
                  </div>
                  <ErrorNotice error={createMutation.error ?? acknowledgeMutation.error} />
                </div>
              ) : (
                <div className="mt-8 text-center text-sm text-muted-foreground">
                  <Icons.MousePointerClick className="mx-auto size-8 opacity-40" />
                  <p className="mt-3">
                    Select an alert to inspect evidence and recommended action.
                  </p>
                </div>
              )}
            </section>
          </div>
        </section>
      ) : null}

      {view === "interventions" ? (
        <InterventionPanel
          interventions={interventions}
          followups={
            followupsQuery.data as unknown as
              | Array<{
                  id: string;
                  intervention_id: string;
                  scheduled_for: string;
                  status: string;
                  student_name: string;
                  issue: string;
                }>
              | undefined
          }
          updateMutation={updateMutation}
          followupMutation={followupMutation}
          outcomeMutation={outcomeMutation}
          interventionId={interventionId}
          setInterventionId={setInterventionId}
          outcomeNotes={outcomeNotes}
          setOutcomeNotes={setOutcomeNotes}
        />
      ) : null}
      <p className="text-xs text-muted-foreground">
        V4 boundary: current/previous observable data only. No dropout prediction, opaque risk
        score, automatic high-impact action, causal claim, or V5/V6 feature is used.
      </p>
    </div>
  );
}

function ConceptMap({
  map,
}: {
  map?: Array<{
    id: string;
    concept_key: string;
    label: string;
    subject: string;
    prerequisite_id: string | null;
    prerequisite_label: string | null;
  }>;
}) {
  return (
    <section className="surface-panel p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Curriculum-controlled map
          </p>
          <h2 className="mt-1 text-xl font-bold">Explicit prerequisite relationships</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Only teacher/admin-defined concept relationships are shown. Historical content is not
            retroactively labeled.
          </p>
        </div>
        <Icons.GitBranch className="size-5 text-primary" />
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {map?.map((item) => (
          <div
            key={`${item.id}-${item.prerequisite_id ?? "none"}`}
            className="rounded-lg border border-border p-3"
          >
            <p className="text-sm font-semibold">{item.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {item.subject || "Subject not specified"}
            </p>
            <p className="mt-2 text-xs">
              {item.prerequisite_label ? (
                <>
                  <span className="text-muted-foreground">Prerequisite:</span>{" "}
                  {item.prerequisite_label}
                </>
              ) : (
                <span className="text-muted-foreground">No prerequisite recorded</span>
              )}
            </p>
          </div>
        ))}
        {!map?.length ? (
          <p className="text-sm text-muted-foreground">
            No curriculum-controlled concept relationships are available yet.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function SchoolPanel({
  overview,
  report,
}: {
  overview?: Overview;
  report?: {
    generatedFrom?: Record<string, unknown> | null;
    alerts?: Array<{ severity: string; count: number }>;
    interventions?: Array<{ status: string; count: number }>;
  };
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={<Icons.TriangleAlert className="size-4" />}
          label="Alerts"
          value={String(overview?.alerts?.reduce((sum, item) => sum + Number(item.count), 0) ?? 0)}
        />
        <Metric
          icon={<Icons.Network className="size-4" />}
          label="Signal categories"
          value={String(overview?.signals?.length ?? 0)}
        />
        <Metric
          icon={<Icons.LifeBuoy className="size-4" />}
          label="Intervention records"
          value={String(
            overview?.interventions?.reduce((sum, item) => sum + Number(item.count), 0) ?? 0,
          )}
        />
        <Metric
          icon={<Icons.CalendarClock className="size-4" />}
          label="Follow-ups"
          value={String(
            overview?.followups?.reduce((sum, item) => sum + Number(item.count), 0) ?? 0,
          )}
        />
      </div>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={<Icons.CalendarCheck className="size-4" />}
          label="Attendance · 30 days"
          value={
            overview?.attendance?.[0]?.attendance_percentage == null
              ? "Insufficient data"
              : `${overview.attendance[0].attendance_percentage}%`
          }
        />
        <Metric
          icon={<Icons.NotebookPen className="size-4" />}
          label="Homework completion"
          value={
            overview?.homework?.[0]?.assigned
              ? `${Math.round((Number(overview.homework[0].completed) / Number(overview.homework[0].assigned)) * 100)}%`
              : "Insufficient data"
          }
        />
        <Metric
          icon={<Icons.Bot className="size-4" />}
          label="AI requests · 30 days"
          value={String(overview?.aiUsage?.[0]?.requests ?? 0)}
        />
        <Metric
          icon={<Icons.DatabaseZap className="size-4" />}
          label="AI failures"
          value={String(overview?.aiUsage?.[0]?.failures ?? 0)}
        />
      </section>
      <section className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
        <div className="surface-panel p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Published performance by subject
          </p>
          <div className="mt-4 space-y-3">
            {overview?.performance?.map((row) => (
              <div key={row.subject} className="flex items-center gap-3">
                <span className="w-36 truncate text-sm font-semibold">{row.subject}</span>
                <div className="h-2 flex-1 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{
                      width: `${Math.max(0, Math.min(100, Number(row.average_percentage)))}%`,
                    }}
                  />
                </div>
                <span className="w-16 text-right text-sm font-bold tabular-nums">
                  {row.average_percentage}%
                </span>
                <span className="text-xs text-muted-foreground">{row.records} records</span>
              </div>
            )) ?? <p className="text-sm text-muted-foreground">Insufficient data.</p>}
          </div>
        </div>
        <div className="surface-panel p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Latest run
          </p>
          {report?.generatedFrom ? (
            <div className="mt-4 space-y-2 text-sm">
              <p>
                Status: <strong>{String(report.generatedFrom.status)}</strong>
              </p>
              <p>
                Window: <strong>{String(report.generatedFrom.window_days)} days</strong>
              </p>
              <p>
                Records examined: <strong>{String(report.generatedFrom.records_examined)}</strong>
              </p>
              <p>
                Alerts created: <strong>{String(report.generatedFrom.alerts_created)}</strong>
              </p>
              <p className="text-xs text-muted-foreground">
                Report remains observational and evidence-backed; it does not forecast outcomes.
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              No intelligence run has been completed yet.
            </p>
          )}
        </div>
      </section>
      <p className="text-xs text-muted-foreground">
        Dashboard source: published grades, persisted attendance, published homework/submissions, V3
        AI usage records, V4 signals, alerts and interventions. Missing records are shown as
        insufficient data.
      </p>
    </div>
  );
}

function InterventionPanel({
  interventions,
  followups,
  updateMutation,
  followupMutation,
  outcomeMutation,
  interventionId,
  setInterventionId,
  outcomeNotes,
  setOutcomeNotes,
}: {
  interventions: Intervention[];
  followups?: Array<{
    id: string;
    intervention_id: string;
    scheduled_for: string;
    status: string;
    student_name: string;
    issue: string;
  }>;
  updateMutation: InterventionActionMutation;
  followupMutation: StringActionMutation;
  outcomeMutation: StringActionMutation;
  interventionId: string | null;
  setInterventionId: (id: string | null) => void;
  outcomeNotes: string;
  setOutcomeNotes: (value: string) => void;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="surface-panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Human-owned cases
            </p>
            <h2 className="mt-1 text-xl font-bold">Intervention workflow</h2>
          </div>
          <Badge variant="outline" className="rounded-full">
            {interventions.length}
          </Badge>
        </div>
        <div className="divide-y divide-border">
          {interventions.map((item) => (
            <div key={item.id} className="p-4">
              <div className="flex flex-wrap items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                  <Icons.LifeBuoy className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {item.student_name} · {item.issue}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.evidence}</p>
                  <p className="mt-2 text-xs">
                    Priority: <strong>{item.priority}</strong> · Status:{" "}
                    <strong>{item.status}</strong>
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    updateMutation.mutate({
                      id: item.id,
                      status:
                        item.status === "new"
                          ? "reviewed"
                          : item.status === "reviewed"
                            ? "assigned"
                            : "in_progress",
                    })
                  }
                >
                  Advance status
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => followupMutation.mutate(item.id)}
                >
                  Schedule 7-day follow-up
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setInterventionId(item.id)}>
                  Record outcome
                </Button>
              </div>
            </div>
          ))}
          {!interventions.length ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Icons.Inbox className="mx-auto size-8 opacity-40" />
              <p className="mt-3">
                No intervention records yet. Create one from an alert after reviewing its evidence.
              </p>
            </div>
          ) : null}
        </div>
      </section>
      <aside className="space-y-5">
        <section className="surface-panel p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Follow-ups
          </p>
          <div className="mt-3 space-y-2">
            {followups?.map((item) => (
              <div key={item.id} className="rounded-lg border border-border p-3">
                <p className="text-sm font-semibold">
                  {item.student_name} · {item.status}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.issue} · scheduled {item.scheduled_for}
                </p>
              </div>
            ))}
            {!followups?.length ? (
              <p className="text-sm text-muted-foreground">No follow-ups scheduled.</p>
            ) : null}
          </div>
        </section>
        <section className="surface-panel p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Outcome measurement
          </p>
          {interventionId ? (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-muted-foreground">
                Record an outcome without claiming causality. If data is not sufficient, keep the
                result as insufficient data.
              </p>
              <textarea
                value={outcomeNotes}
                onChange={(event) => setOutcomeNotes(event.target.value)}
                rows={3}
                placeholder="What was observed during follow-up?"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    outcomeMutation.mutate(interventionId);
                    setInterventionId(null);
                  }}
                >
                  Record insufficient data
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setInterventionId(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Select an intervention to record a measured outcome.
            </p>
          )}
        </section>
      </aside>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="metric-panel p-4">
      <span className="grid size-9 place-items-center rounded-xl bg-primary-soft text-primary">
        {icon}
      </span>
      <p className="mt-3 text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tracking-tight">{value}</p>
    </div>
  );
}
