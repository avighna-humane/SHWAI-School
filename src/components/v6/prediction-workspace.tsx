import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Icons from "lucide-react";
import { listV6Predictions, requestV6Prediction, reviewV6Prediction } from "@/actions/v6";
import { useAppState } from "@/app/providers/app-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function V6PredictionWorkspace() {
  const { schoolId, role } = useAppState();
  const queryClient = useQueryClient();
  const canReview = ["admin", "principal", "owner"].includes(role);
  const predictions = useQuery({
    queryKey: ["v6-predictions", schoolId],
    queryFn: () => listV6Predictions(),
    enabled: !["student", "parent"].includes(role),
  });
  const [predictionType, setPredictionType] = React.useState("student_performance");
  const [targetType, setTargetType] = React.useState("student");
  const [targetId, setTargetId] = React.useState("");
  const requestMutation = useMutation({
    mutationFn: () =>
      requestV6Prediction({
        data: {
          predictionType: predictionType as "student_performance",
          targetEntityType: targetType as "student",
          targetEntityId: targetId,
          horizon: "next_review_window",
        },
      }),
    onSuccess: () => {
      setTargetId("");
      void queryClient.invalidateQueries({ queryKey: ["v6-predictions", schoolId] });
    },
  });
  const reviewMutation = useMutation({
    mutationFn: (data: { predictionId: string; status: "approved" | "rejected" }) =>
      reviewV6Prediction({ data: { ...data, note: "Reviewed in V6 prediction workspace." } }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["v6-predictions", schoolId] }),
  });
  return (
    <div className="space-y-6">
      <header>
        <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-ai">
          <span className="size-1.5 rounded-full bg-ai" /> V6 PREDICTION FOUNDATIONS
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight">Predictions with limits</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Prediction records are persisted for evaluation, but SHWAI never fabricates a value when
          historical data is insufficient. High-impact outputs remain pending human review.
        </p>
      </header>
      <section className="surface-panel p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-ai-soft text-ai">
            <Icons.ChartNoAxesCombined className="size-4" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Prediction request
            </p>
            <h2 className="mt-1 text-xl font-bold">Create an auditable request</h2>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <select
            value={predictionType}
            onChange={(event) => setPredictionType(event.target.value)}
            className="h-10 rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="student_performance">Student performance</option>
            <option value="attendance">Attendance</option>
            <option value="homework_completion">Homework completion</option>
            <option value="exam_score">Exam score</option>
            <option value="dropout_risk">Dropout risk</option>
            <option value="teacher_workload">Teacher workload</option>
            <option value="resource_demand">Resource demand</option>
          </select>
          <select
            value={targetType}
            onChange={(event) => setTargetType(event.target.value)}
            className="h-10 rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
            <option value="class">Class</option>
            <option value="school">School</option>
            <option value="intervention">Intervention</option>
          </select>
          <input
            value={targetId}
            onChange={(event) => setTargetId(event.target.value)}
            placeholder="Target ID"
            className="h-10 rounded-md border border-border bg-background px-3 text-sm"
          />
          <p className="flex items-center rounded-md border border-border bg-muted/30 px-3 text-xs leading-5 text-muted-foreground">
            Historical evidence counts and data-quality warnings are computed server-side from this
            school’s persisted records.
          </p>
        </div>
        <Button
          className="mt-3"
          onClick={() => requestMutation.mutate()}
          disabled={requestMutation.isPending || targetId.trim().length < 1}
        >
          {requestMutation.isPending ? "Recording…" : "Record prediction request"}
        </Button>
        {requestMutation.data ? (
          <div className="mt-3 rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm">
            <strong>{requestMutation.data.status}</strong>
            <p className="mt-1 text-muted-foreground">{requestMutation.data.message}</p>
          </div>
        ) : null}
        {requestMutation.error ? (
          <p className="mt-3 text-sm text-danger">{(requestMutation.error as Error).message}</p>
        ) : null}
      </section>
      <section className="surface-panel p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Prediction ledger</h2>
          <Badge variant="outline">PERSISTED RECORDS</Badge>
        </div>
        <div className="mt-4 space-y-3">
          {(
            predictions.data as
              | Array<{
                  id: string;
                  prediction_type: string;
                  target_entity_type: string;
                  target_entity_id: string;
                  confidence: string;
                  status: string;
                  human_review_status: string;
                  warnings: Array<{ warning_type: string; detail: string }>;
                }>
              | undefined
          )?.map((prediction) => (
            <div key={prediction.id} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold">{prediction.prediction_type}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {prediction.target_entity_type} · {prediction.target_entity_id} · confidence{" "}
                    {prediction.confidence}
                  </p>
                </div>
                <Badge variant="outline">{prediction.status}</Badge>
              </div>
              <div className="mt-3 space-y-1">
                {prediction.warnings?.map((warning) => (
                  <p key={warning.warning_type} className="text-xs text-warning-foreground">
                    {warning.detail}
                  </p>
                ))}
              </div>
              {canReview &&
              ["pending_model", "generated", "pending_review"].includes(prediction.status) ? (
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      reviewMutation.mutate({ predictionId: prediction.id, status: "approved" })
                    }
                  >
                    Approve for review
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      reviewMutation.mutate({ predictionId: prediction.id, status: "rejected" })
                    }
                  >
                    Reject
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
          {!predictions.data?.length ? (
            <p className="text-sm text-muted-foreground">
              No prediction records yet. With fewer than 30 historical observations the system
              records insufficient data rather than a fabricated value.
            </p>
          ) : null}
        </div>
      </section>
      <p className="text-xs text-muted-foreground">
        Prediction records are not automatically used to punish students, deny opportunities,
        discipline teachers, make medical decisions, or trigger irreversible administrative actions.
      </p>
    </div>
  );
}
