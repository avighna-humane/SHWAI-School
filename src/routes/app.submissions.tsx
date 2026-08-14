import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAppState } from "@/app/providers/app-state";
import {
  listAllSubmissions,
  gradeSubmission,
  type SubmissionWithHomework,
} from "@/actions/homework";
import { PermissionDenied } from "@/components/feedback/states";
import { ROLE_LABEL } from "@/config/roles";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export const Route = createFileRoute("/app/submissions")({ component: SubmissionsPage });

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    submitted: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    late: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    graded: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${map[status] ?? "bg-muted text-muted-foreground"}`}
    >
      {status}
    </span>
  );
}

function SubmissionsPage() {
  const { role, schoolId, userId } = useAppState();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [gradeOpen, setGradeOpen] = useState(false);
  const [selected, setSelected] = useState<SubmissionWithHomework | null>(null);
  const [gradeVal, setGradeVal] = useState("");
  const [feedbackVal, setFeedbackVal] = useState("");
  const canGrade = ["teacher", "principal", "admin", "owner"].includes(role);

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ["all-submissions", schoolId, role, userId],
    queryFn: () => listAllSubmissions({ data: {} }),
    enabled: canGrade && typeof window !== "undefined",
  });

  const gradeMut = useMutation({
    mutationFn: () =>
      gradeSubmission({
        data: {
          submissionId: selected!.id,
          grade: gradeVal ? Number(gradeVal) : null,
          feedback: feedbackVal,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-submissions"] });
      toast.success("Graded!");
      setGradeOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openGrade(sub: SubmissionWithHomework) {
    setSelected(sub);
    setGradeVal(sub.grade != null ? String(sub.grade) : "");
    setFeedbackVal(sub.feedback);
    setGradeOpen(true);
  }

  if (!canGrade) {
    return <PermissionDenied role={ROLE_LABEL[role]} />;
  }

  const filtered = submissions.filter(
    (s) =>
      !search ||
      s.student_name.toLowerCase().includes(search.toLowerCase()) ||
      s.homework_title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <header>
        <p className="mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
          <span className="size-1.5 rounded-full bg-primary" /> SHWAI workspace
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight">Submissions</h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
          Review and grade student homework submissions.
        </p>
      </header>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Icons.Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search student or homework…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Badge variant="outline" className="rounded-full">
          {filtered.length} submissions
        </Badge>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          <Icons.Loader2 className="mr-2 size-5 animate-spin" />
          Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-20 text-center">
          <Icons.FileCheck className="size-10 text-muted-foreground/40" />
          <p className="font-semibold">No submissions yet</p>
          <p className="text-sm text-muted-foreground">
            Submissions will appear here once students submit their homework.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                {[
                  "Student",
                  "Homework",
                  "Subject",
                  "Class",
                  "Submitted",
                  "Status",
                  "Grade",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr
                  key={s.id}
                  className="border-b transition-colors last:border-0 hover:bg-muted/30"
                >
                  <td className="px-4 py-3 font-medium">{s.student_name}</td>
                  <td className="max-w-[180px] px-4 py-3">
                    <p className="truncate">{s.homework_title}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{s.homework_subject}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.class_label}</td>
                  <td className="px-4 py-3 text-muted-foreground">{fmtDate(s.submitted_at)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {s.grade != null ? s.grade : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {s.file_name && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          title="Download attachment"
                          onClick={() => {
                            const a = document.createElement("a");
                            a.href = `data:${s.file_type};base64,${s.file_data}`;
                            a.download = s.file_name;
                            a.click();
                          }}
                        >
                          <Icons.Download className="size-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => openGrade(s)}>
                        <Icons.PenLine className="mr-1.5 size-3.5" />
                        Grade
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Grade Dialog */}
      <Dialog open={gradeOpen} onOpenChange={setGradeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Grade — {selected?.student_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-sm font-medium">{selected?.homework_title}</p>
              <p className="text-xs text-muted-foreground">
                {selected?.homework_subject} · {selected?.class_label}
              </p>
            </div>
            {selected?.comment && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                <span className="font-medium">Student note: </span>
                {selected.comment}
              </div>
            )}
            {selected?.file_name && (
              <div className="flex items-center gap-2 rounded-lg border p-3">
                <Icons.Paperclip className="size-4 text-muted-foreground" />
                <span className="flex-1 truncate text-sm">{selected.file_name}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = `data:${selected.file_type};base64,${selected.file_data}`;
                    a.download = selected.file_name;
                    a.click();
                  }}
                >
                  Download
                </Button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Grade</Label>
                <Input
                  type="number"
                  min="0"
                  value={gradeVal}
                  onChange={(e) => setGradeVal(e.target.value)}
                  placeholder="Marks"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Feedback</Label>
              <Textarea
                rows={3}
                value={feedbackVal}
                onChange={(e) => setFeedbackVal(e.target.value)}
                placeholder="Comments for the student…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGradeOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => gradeMut.mutate()} disabled={gradeMut.isPending}>
              {gradeMut.isPending ? <Icons.Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
