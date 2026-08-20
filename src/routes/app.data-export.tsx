import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { downloadExport, exportSchoolData, getExportStatus } from "@/actions/data";
import { useAppState } from "@/app/providers/app-state";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/app/data-export")({ component: DataExportPage });

function DataExportPage() {
  const { role } = useAppState();
  const [exportType, setExportType] = useState<"students" | "attendance" | "grades">("students");
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [jobId, setJobId] = useState<string | null>(null);
  const exportMutation = useMutation({
    mutationFn: () => exportSchoolData({ data: { exportType, format } }),
    onSuccess: (result) => {
      setJobId(result.jobId);
      toast.success("Export queued. The private artifact will be available after processing.");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const statusQuery = useQuery({
    queryKey: ["data-export-status", jobId],
    queryFn: () => getExportStatus({ data: { id: jobId! } }),
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "queued" || status === "running" ? 2000 : false;
    },
  });
  const downloadMutation = useMutation({
    mutationFn: () => downloadExport({ data: { id: jobId! } }),
    onSuccess: (result) => {
      const link = document.createElement("a");
      link.href = result.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.download = result.fileName;
      link.click();
      toast.success("Private export download link created; it expires shortly.");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  useEffect(() => {
    if (statusQuery.data?.status === "failed" || statusQuery.data?.status === "dead_letter") {
      toast.error(statusQuery.data.failureReason || "Export failed");
    }
  }, [statusQuery.data?.status, statusQuery.data?.failureReason]);
  if (!["owner", "principal"].includes(role))
    return (
      <div className="surface-panel p-6 text-sm text-muted-foreground">
        Data export is restricted to the owner and principal roles.
      </div>
    );
  const status = statusQuery.data?.status ?? (jobId ? "queued" : null);
  return (
    <div className="space-y-6 pb-8">
      <header>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
          Data control
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight">School data export</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Exports are permission-protected, rate-limited, audited, school-scoped, processed by the
          background worker, stored in a private bucket, and delivered through a short-lived signed
          download URL.
        </p>
      </header>
      <section className="surface-panel space-y-4 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm font-medium">
            Dataset
            <select
              value={exportType}
              onChange={(event) => setExportType(event.target.value as typeof exportType)}
              className="mt-2 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="students">Students</option>
              <option value="attendance">Attendance</option>
              <option value="grades">Grades</option>
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium">
            Format
            <select
              value={format}
              onChange={(event) => setFormat(event.target.value as typeof format)}
              className="mt-2 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending}>
            {exportMutation.isPending ? "Queueing…" : "Queue private export"}
          </Button>
          {jobId && status ? (
            <span className="text-sm text-muted-foreground">
              Job {jobId.slice(0, 8)} · {status}
            </span>
          ) : null}
          {statusQuery.data?.downloadable ? (
            <Button
              variant="outline"
              onClick={() => downloadMutation.mutate()}
              disabled={downloadMutation.isPending}
            >
              {downloadMutation.isPending ? "Authorizing…" : "Download private artifact"}
            </Button>
          ) : null}
        </div>
        {statusQuery.data?.failureReason ? (
          <p className="text-sm text-danger">{statusQuery.data.failureReason}</p>
        ) : null}
      </section>
    </div>
  );
}
