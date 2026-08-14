import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Icons from "lucide-react";
import {
  getV6AiSettings,
  getV6AiUsageGovernance,
  listV6Provenance,
  reviewV6Provenance,
  updateV6AiSettings,
} from "@/actions/v6";
import { useAppState } from "@/app/providers/app-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function V6GovernanceWorkspace() {
  const { schoolId, role } = useAppState();
  const queryClient = useQueryClient();
  const canManage = ["admin", "principal", "owner"].includes(role);
  const provenance = useQuery({
    queryKey: ["v6-provenance", schoolId],
    queryFn: () => listV6Provenance(),
    enabled: !["student", "parent"].includes(role),
  });
  const settings = useQuery({
    queryKey: ["v6-ai-settings", schoolId],
    queryFn: () => getV6AiSettings(),
    enabled: !["student", "parent"].includes(role),
  });
  const usage = useQuery({
    queryKey: ["v6-ai-usage-governance", schoolId],
    queryFn: () => getV6AiUsageGovernance(),
    enabled: canManage,
  });
  const [enableTutor, setEnableTutor] = React.useState(true);
  const [enableContent, setEnableContent] = React.useState(true);
  const [enablePredictions, setEnablePredictions] = React.useState(false);
  React.useEffect(() => {
    if (settings.data) {
      setEnableTutor(Boolean(settings.data.enable_ai_tutor));
      setEnableContent(Boolean(settings.data.enable_content_generation));
      setEnablePredictions(Boolean(settings.data.enable_predictions));
    }
  }, [settings.data]);
  const saveMutation = useMutation({
    mutationFn: () =>
      updateV6AiSettings({
        data: {
          enableAiTutor: enableTutor,
          enableContentGeneration: enableContent,
          enablePredictions,
          approvedProviders: [],
          approvedKnowledgeSources: true,
          humanReviewRequired: true,
          rolePermissions: { teacher: enableContent, student: enableTutor, leadership: true },
        },
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["v6-ai-settings", schoolId] }),
  });
  const reviewMutation = useMutation({
    mutationFn: (data: {
      provenanceId: string;
      newStatus: "approved" | "rejected";
      reviewNote: string;
    }) => reviewV6Provenance({ data }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["v6-provenance", schoolId] }),
  });
  return (
    <div className="space-y-6">
      <header>
        <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-ai">
          <span className="size-1.5 rounded-full bg-ai" /> V6 AI GOVERNANCE
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight">Evidence before authority</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Every supported AI output can retain its model, prompt-template version, sources,
          confidence, uncertainty, missing-data warnings, review history, and output versions.
          Approval is enforced on the server.
        </p>
      </header>
      <section className="grid gap-4 sm:grid-cols-3">
        <Metric
          label="Provenance records"
          value={String(provenance.data?.length ?? 0)}
          icon={<Icons.Fingerprint className="size-4" />}
        />
        <Metric
          label="AI requests"
          value={String(usage.data?.totals?.[0]?.requests ?? 0)}
          icon={<Icons.Activity className="size-4" />}
        />
        <Metric
          label="Human review"
          value={settings.data?.human_review_required ? "Required" : "Disabled"}
          icon={<Icons.UserCheck className="size-4" />}
        />
      </section>
      {canManage ? (
        <section className="surface-panel p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                School AI settings
              </p>
              <h2 className="mt-1 text-xl font-bold">Govern capabilities at the school boundary</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Prediction is disabled by default and all high-impact outputs remain reviewable.
              </p>
            </div>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving…" : "Save settings"}
            </Button>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Toggle label="AI tutor" value={enableTutor} onChange={setEnableTutor} />
            <Toggle
              label="AI content generation"
              value={enableContent}
              onChange={setEnableContent}
            />
            <Toggle
              label="Predictive analytics"
              value={enablePredictions}
              onChange={setEnablePredictions}
            />
          </div>
          {saveMutation.isError ? (
            <p className="mt-3 text-sm text-danger">{(saveMutation.error as Error).message}</p>
          ) : null}
        </section>
      ) : null}
      <section className="surface-panel p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
              AI provenance ledger
            </p>
            <h2 className="mt-1 text-xl font-bold">Generated outputs and review state</h2>
          </div>
          <Badge variant="outline">PERSISTED</Badge>
        </div>
        <div className="mt-5 space-y-3">
          {(
            provenance.data as
              | Array<{
                  id: string;
                  output_type: string;
                  output_id: string;
                  provider: string;
                  model: string;
                  prompt_template: string;
                  confidence: string;
                  approval_status: string;
                  output_version: number;
                  missing_data: unknown[];
                  bias_warnings: unknown[];
                }>
              | undefined
          )
            ?.slice(0, 12)
            .map((item) => (
              <div key={item.id} className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold">{item.output_type}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.provider} · {item.model} · version {item.output_version}
                    </p>
                  </div>
                  <Badge variant="outline">{item.approval_status}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>Confidence: {item.confidence}</span>
                  <span>
                    Missing data: {Array.isArray(item.missing_data) ? item.missing_data.length : 0}
                  </span>
                  <span>
                    Bias warnings:{" "}
                    {Array.isArray(item.bias_warnings) ? item.bias_warnings.length : 0}
                  </span>
                </div>
                {canManage &&
                ["generated", "pending_review", "revised"].includes(item.approval_status) ? (
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        reviewMutation.mutate({
                          provenanceId: item.id,
                          newStatus: "approved",
                          reviewNote: "Approved after human review.",
                        })
                      }
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        reviewMutation.mutate({
                          provenanceId: item.id,
                          newStatus: "rejected",
                          reviewNote: "Rejected after human review.",
                        })
                      }
                    >
                      Reject
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          {!provenance.data?.length ? (
            <p className="text-sm text-muted-foreground">
              No V6 provenance records are available yet. Existing V3/V4 generation remains governed
              by its existing AI records.
            </p>
          ) : null}
        </div>
      </section>
      <p className="text-xs text-muted-foreground">
        This workspace does not expose API keys, hidden system prompts, or private infrastructure
        details. Provider configuration and database availability are reported explicitly.
      </p>
    </div>
  );
}
function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="metric-panel p-4">
      <span className="grid size-8 place-items-center rounded-lg bg-ai-soft text-ai">{icon}</span>
      <p className="mt-3 text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-extrabold">{value}</p>
    </div>
  );
}
function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex items-center justify-between rounded-lg border border-border p-3 text-left"
    >
      <span className="text-sm font-medium">{label}</span>
      <span
        className={`relative h-6 w-11 rounded-full transition-colors ${value ? "bg-ai" : "bg-muted"}`}
      >
        <span
          className={`absolute top-1 size-4 rounded-full bg-white transition-transform ${value ? "translate-x-6" : "translate-x-1"}`}
        />
      </span>
    </button>
  );
}
