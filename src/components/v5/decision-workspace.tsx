import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Icons from "lucide-react";
import {
  createScenario,
  explainScenario,
  getWorkloadOverview,
  listCurriculumHealth,
  listInterventionExperiments,
  listLearningDebt,
  refreshLearningDebt,
  listScenarios,
  recordScenarioDecision,
} from "@/actions/decision";
import { useAppState } from "@/app/providers/app-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function DecisionWorkspace() {
  const { schoolId, role } = useAppState();
  const queryClient = useQueryClient();
  const canLead = ["admin", "principal", "owner"].includes(role);
  const scenarios = useQuery({
    queryKey: ["v5-scenarios", schoolId],
    queryFn: () => listScenarios(),
    enabled: canLead,
  });
  const curriculum = useQuery({
    queryKey: ["v5-curriculum-health", schoolId],
    queryFn: () => listCurriculumHealth(),
    enabled: !["student", "parent"].includes(role),
  });
  const debt = useQuery({
    queryKey: ["v5-learning-debt", schoolId],
    queryFn: () => listLearningDebt(),
    enabled: !["student", "parent"].includes(role),
  });
  const experiments = useQuery({
    queryKey: ["v5-experiments", schoolId],
    queryFn: () => listInterventionExperiments(),
    enabled: canLead,
  });
  const workload = useQuery({
    queryKey: ["v5-workload", schoolId],
    queryFn: () => getWorkloadOverview(),
    enabled: !["student", "parent"].includes(role),
  });
  const [name, setName] = React.useState("");
  const [groupSize, setGroupSize] = React.useState("24");
  const [sessions, setSessions] = React.useState("1");
  const [sessionMinutes, setSessionMinutes] = React.useState("45");
  const scenarioMutation = useMutation({
    mutationFn: () =>
      createScenario({
        data: {
          name,
          description: "Explicit V5 operational scenario",
          inputs: {
            availableTeachers: 4,
            availableRooms: 2,
            roomCapacity: 30,
            groupSize: Number(groupSize),
            addedSessions: Number(sessions),
            sessionMinutes: Number(sessionMinutes),
            assignedTeachers: 1,
            assignedRooms: 0,
          },
          assumptions: { source: "administrator_input" },
          constraints: { noPredictiveOutcome: true },
        },
      }),
    onSuccess: () => {
      setName("");
      void queryClient.invalidateQueries({ queryKey: ["v5-scenarios", schoolId] });
    },
  });
  const decisionMutation = useMutation({
    mutationFn: (scenarioId: string) =>
      recordScenarioDecision({
        data: {
          scenarioId,
          selectedOption: "Reviewed in V5 decision workspace",
          notes: "Administrator reviewed calculated metrics and explicit trade-offs.",
        },
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["v5-scenarios", schoolId] }),
  });
  const debtRefreshMutation = useMutation({
    mutationFn: () => refreshLearningDebt(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["v5-learning-debt", schoolId] });
      void queryClient.invalidateQueries({ queryKey: ["v5-curriculum-health", schoolId] });
    },
  });
  const explanationMutation = useMutation({
    mutationFn: (scenarioId: string) =>
      explainScenario({
        data: {
          scenarioId,
          question: "Explain the calculated workload, room, capacity, warnings, and trade-offs.",
        },
      }),
  });
  return (
    <div className="space-y-6">
      <header>
        <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
          <span className="size-1.5 rounded-full bg-primary" /> V5 DECISION INTELLIGENCE
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight">Calculate before deciding</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Scenarios use explicit assumptions and server-side calculations. They show known,
          calculated, assumed, and unknown values; they never claim predicted academic outcomes.
        </p>
      </header>
      {canLead ? (
        <section className="surface-panel p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-ai-soft text-ai">
              <Icons.SlidersHorizontal className="size-5" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                What-if simulator
              </p>
              <h2 className="mt-1 text-xl font-bold">Add a transparent session scenario</h2>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Scenario name"
              className="h-10 rounded-md border border-border bg-background px-3 text-sm sm:col-span-2"
            />
            <input
              value={groupSize}
              onChange={(event) => setGroupSize(event.target.value)}
              inputMode="numeric"
              placeholder="Students served"
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            />
            <input
              value={sessions}
              onChange={(event) => setSessions(event.target.value)}
              inputMode="numeric"
              placeholder="Added sessions"
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            />
            <input
              value={sessionMinutes}
              onChange={(event) => setSessionMinutes(event.target.value)}
              inputMode="numeric"
              placeholder="Minutes/session"
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            />
          </div>
          <Button
            className="mt-3"
            onClick={() => scenarioMutation.mutate()}
            disabled={scenarioMutation.isPending || name.trim().length < 2}
          >
            {scenarioMutation.isPending ? "Calculating…" : "Calculate scenario"}
          </Button>
          {scenarioMutation.data ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {Object.entries(scenarioMutation.data.output.metrics).map(([key, value]) => (
                <div key={key} className="rounded-lg border border-border bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">
                    {key.replaceAll(/([A-Z])/g, " $1")}
                  </p>
                  <p className="mt-1 text-lg font-bold">{String(value)}</p>
                </div>
              ))}
            </div>
          ) : null}
          {scenarioMutation.error ? (
            <p className="mt-2 text-sm text-danger">{(scenarioMutation.error as Error).message}</p>
          ) : null}
        </section>
      ) : null}
      <section className="grid gap-5 xl:grid-cols-2">
        <Panel title="Saved scenarios" icon={<Icons.GitCompare className="size-4" />}>
          <div className="space-y-2">
            {(
              scenarios.data as
                | Array<{
                    id: string;
                    name: string;
                    status: string;
                    outputs: Record<string, unknown>;
                    warnings: string[];
                  }>
                | undefined
            )
              ?.slice(0, 8)
              .map((item) => (
                <div key={item.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{item.name}</p>
                    <Badge variant="outline">{item.status}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {item.warnings?.length
                      ? item.warnings.join(" ")
                      : "No calculated constraint warnings."}
                  </p>
                  {canLead && item.status !== "selected" ? (
                    <Button
                      className="mt-2"
                      size="sm"
                      variant="outline"
                      onClick={() => decisionMutation.mutate(item.id)}
                    >
                      Record reviewed decision
                    </Button>
                  ) : null}
                  {canLead ? (
                    <Button
                      className="mt-2 ml-2"
                      size="sm"
                      variant="ghost"
                      onClick={() => explanationMutation.mutate(item.id)}
                      disabled={explanationMutation.isPending}
                    >
                      Explain calculated result
                    </Button>
                  ) : null}
                </div>
              ))}
            {!scenarios.data?.length ? (
              <p className="text-sm text-muted-foreground">No saved scenarios yet.</p>
            ) : null}
          </div>
          {explanationMutation.error ? (
            <p className="mt-3 text-sm text-danger">
              {(explanationMutation.error as Error).message}
            </p>
          ) : null}
          {explanationMutation.data ? (
            <div className="mt-3 rounded-lg border border-ai/20 bg-ai-soft/20 p-3 text-sm leading-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ai">
                Editable AI explanation
              </p>
              <p className="mt-2 whitespace-pre-wrap">{explanationMutation.data.text}</p>
            </div>
          ) : null}
        </Panel>
        <Panel
          title="Curriculum health and learning debt"
          icon={<Icons.Network className="size-4" />}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Coverage is recorded from explicit academic records; it is not inferred from uploaded
              files.
            </p>
            {!["student", "parent"].includes(role) ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => debtRefreshMutation.mutate()}
                disabled={debtRefreshMutation.isPending}
              >
                {debtRefreshMutation.isPending ? "Refreshing…" : "Refresh evidence"}
              </Button>
            ) : null}
          </div>
          <div className="mt-3 space-y-2">
            {(
              curriculum.data as
                | Array<{ id: string; title: string; pacing_state: string; actual_status: string }>
                | undefined
            )
              ?.slice(0, 5)
              .map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border p-3"
                >
                  <span className="text-sm font-medium">{item.title}</span>
                  <Badge variant="outline">{item.pacing_state ?? item.actual_status}</Badge>
                </div>
              ))}
            {(
              debt.data as
                | Array<{ id: string; category: string; severity: string; affected_group: string }>
                | undefined
            )
              ?.slice(0, 5)
              .map((item) => (
                <div key={item.id} className="rounded-lg border border-warning/20 bg-warning/5 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.category}</span>
                    <Badge variant="outline">{item.severity}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.affected_group || "Affected group not recorded"}
                  </p>
                </div>
              ))}
            {!curriculum.data?.length && !debt.data?.length ? (
              <p className="text-sm text-muted-foreground">
                No curriculum coverage or learning-debt records yet.
              </p>
            ) : null}
          </div>
        </Panel>
        <Panel title="Intervention experiments" icon={<Icons.Beaker className="size-4" />}>
          <div className="space-y-2">
            {(
              experiments.data as
                | Array<{
                    id: string;
                    problem: string;
                    status: string;
                    comparison_method: string;
                    review_date: string;
                  }>
                | undefined
            )
              ?.slice(0, 6)
              .map((item) => (
                <div key={item.id} className="rounded-lg border border-border p-3">
                  <p className="text-sm font-semibold">{item.problem}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.comparison_method} · review {item.review_date}
                  </p>
                  <Badge className="mt-2" variant="outline">
                    {item.status}
                  </Badge>
                </div>
              ))}
            {!experiments.data?.length ? (
              <p className="text-sm text-muted-foreground">No experiments recorded yet.</p>
            ) : null}
          </div>
        </Panel>
        <Panel title="Workload evidence" icon={<Icons.Gauge className="size-4" />}>
          <div className="space-y-2">
            {(
              workload.data as
                | Array<{
                    teacherId: string;
                    estimatedMinutes: number;
                    exceedsThreshold: boolean;
                    message: string;
                  }>
                | undefined
            )
              ?.slice(0, 8)
              .map((item) => (
                <div
                  key={item.teacherId}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border p-3"
                >
                  <span className="text-sm font-medium">{item.teacherId}</span>
                  <span className="text-xs text-muted-foreground">{item.estimatedMinutes} min</span>
                  <Badge variant="outline">
                    {item.exceedsThreshold ? "Threshold exceeded" : "Within threshold"}
                  </Badge>
                </div>
              ))}
            {!workload.data?.length ? (
              <p className="text-sm text-muted-foreground">
                No explicit workload tasks recorded yet.
              </p>
            ) : null}
          </div>
        </Panel>
      </section>
      <p className="text-xs text-muted-foreground">
        V5 boundary: transparent calculations and observed evidence only. No future-performance
        prediction, confidence interval, or V6 governance feature is used.
      </p>
    </div>
  );
}
function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="surface-panel p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-lg bg-primary-soft text-primary">
          {icon}
        </span>
        <h2 className="font-bold">{title}</h2>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
