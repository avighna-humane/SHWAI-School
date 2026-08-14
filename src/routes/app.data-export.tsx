import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { exportSchoolData } from "@/actions/data";
import { useAppState } from "@/app/providers/app-state";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/app/data-export")({ component: DataExportPage });

function DataExportPage() {
  const { role } = useAppState();
  const [exportType, setExportType] = useState<"students" | "attendance" | "grades">("students");
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const exportMutation = useMutation({
    mutationFn: () => exportSchoolData({ data: { exportType, format } }),
    onSuccess: (result) => {
      const blob = new Blob([result.content], {
        type: format === "csv" ? "text/csv;charset=utf-8" : "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.fileName;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${result.rowCount} rows; the bounded artifact expires in 15 minutes`);
    },
    onError: (error: Error) => toast.error(error.message),
  });
  if (!["owner", "principal"].includes(role))
    return (
      <div className="surface-panel p-6 text-sm text-muted-foreground">
        Data export is restricted to the owner and principal roles.
      </div>
    );
  return (
    <div className="space-y-6 pb-8">
      <header>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
          Data control
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight">School data export</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Exports are permission-protected, rate-limited, audited, school-scoped, and bounded to
          5,000 records in this synchronous foundation. Larger exports require the background job
          and private object-storage deployment boundary.
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
        <Button onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending}>
          {exportMutation.isPending ? "Preparing export…" : "Generate and download"}
        </Button>
      </section>
    </div>
  );
}
