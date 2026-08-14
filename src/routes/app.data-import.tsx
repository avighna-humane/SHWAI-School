import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createImportJob, listImportJobs, commitStudentImport } from "@/actions/imports";
import { useAppState } from "@/app/providers/app-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/app/data-import")({ component: DataImportPage });

function DataImportPage() {
  const { role, schoolId } = useAppState();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const jobs = useQuery({
    queryKey: ["import-jobs", schoolId],
    queryFn: () => listImportJobs(),
    enabled: Boolean(schoolId) && ["owner", "principal", "admin"].includes(role),
  });
  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Choose a CSV or JSON file");
      const extension = file.name.toLowerCase().split(".").pop();
      if (extension !== "csv" && extension !== "json" && extension !== "xlsx")
        throw new Error("Only CSV, JSON, or XLSX files are accepted");
      return createImportJob({
        data: {
          entity: "students",
          format: extension,
          fileName: file.name,
          fileSize: file.size,
          content: await file.text(),
        },
      });
    },
    onSuccess: (result) => {
      toast.success(`Import staged: ${result.valid} valid, ${result.errors} errors`);
      setFile(null);
      void queryClient.invalidateQueries({ queryKey: ["import-jobs", schoolId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const commit = useMutation({
    mutationFn: (jobId: string) => commitStudentImport({ data: { jobId } }),
    onSuccess: (result) => {
      toast.success(`${result.imported} student records imported atomically`);
      void queryClient.invalidateQueries({ queryKey: ["import-jobs", schoolId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!["owner", "principal", "admin"].includes(role)) {
    return (
      <div className="surface-panel p-6 text-sm text-muted-foreground">
        Data import is restricted to school leadership.
      </div>
    );
  }
  return (
    <div className="space-y-6 pb-8">
      <header>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
          School migration
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight">Data import</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Upload → detect and normalize columns → validate → review errors → commit. Rows are staged
          in a school-scoped transaction; invalid rows are never silently imported. XLSX remains
          configuration-required until a server-side workbook parser and private object storage are
          configured.
        </p>
      </header>
      <section className="surface-panel space-y-4 p-5 sm:p-6">
        <div>
          <h2 className="text-lg font-bold">Stage student records</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            CSV and JSON are parsed server-side. Maximum file size is 5 MB and maximum staged rows
            is 20,000.
          </p>
        </div>
        <input
          type="file"
          accept=".csv,.json,.xlsx"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="block w-full rounded-md border border-input bg-background p-2 text-sm"
        />
        <Button onClick={() => upload.mutate()} disabled={!file || upload.isPending}>
          {upload.isPending ? "Validating…" : "Upload and validate"}
        </Button>
      </section>
      <section className="surface-panel space-y-4 p-5 sm:p-6">
        <div>
          <h2 className="text-lg font-bold">Import jobs</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Review the validation summary and error report before committing a job.
          </p>
        </div>
        <div className="space-y-3">
          {(jobs.data ?? []).map((job) => {
            const summary = (job.summary ?? {}) as {
              total?: number;
              valid?: number;
              errors?: number;
            };
            return (
              <div key={job.id} className="rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{job.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {job.entity} · {job.format} · {new Date(job.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="secondary">{job.status}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-sm">
                  <span>Total: {summary.total ?? 0}</span>
                  <span className="text-success-foreground">Valid: {summary.valid ?? 0}</span>
                  <span className="text-danger">Errors: {summary.errors ?? 0}</span>
                </div>
                {Array.isArray(job.error_report) && job.error_report.length ? (
                  <pre className="mt-3 max-h-32 overflow-auto rounded bg-muted p-2 text-xs">
                    {JSON.stringify(job.error_report.slice(0, 20), null, 2)}
                  </pre>
                ) : null}
                {job.status === "reviewed" || job.status === "validated" ? (
                  <Button
                    className="mt-3"
                    size="sm"
                    onClick={() => commit.mutate(job.id)}
                    disabled={commit.isPending || Boolean(summary.errors)}
                  >
                    {commit.isPending ? "Committing…" : "Commit valid rows"}
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
