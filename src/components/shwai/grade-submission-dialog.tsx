import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { gradeSubmission } from "@/server/submissions";
import type { ActorRole } from "@/server/auth-context";
import type { SubmissionRecord } from "@/types";

export function GradeSubmissionDialog({
  role,
  actorId,
  submission,
  totalMarks,
}: {
  role: ActorRole;
  actorId?: string;
  submission: SubmissionRecord;
  totalMarks: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [marks, setMarks] = useState(submission.marks?.toString() ?? "");
  const [feedback, setFeedback] = useState(submission.feedback ?? "");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      gradeSubmission({
        data: { role, actorId, submissionId: submission.id, marks: marks ? Number(marks) : undefined, feedback: feedback.trim() || undefined },
      }),
    onSuccess: () => {
      toast.success("Grade saved");
      queryClient.invalidateQueries({ queryKey: ["submissions"] });
      queryClient.invalidateQueries({ queryKey: ["homework-activity"] });
      setOpen(false);
    },
    onError: (err: Error) => toast.error(err.message || "Could not save grade."),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={submission.status === "graded" ? "outline" : "default"}>
          <PenLine className="size-3.5" aria-hidden /> {submission.status === "graded" ? "Edit grade" : "Grade"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Grade {submission.studentName}'s work</DialogTitle>
          <DialogDescription>Marks and feedback are visible to the student immediately.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="grade-marks">Marks{totalMarks ? ` (out of ${totalMarks})` : ""}</Label>
            <Input id="grade-marks" type="number" min={0} max={totalMarks ?? undefined} value={marks} onChange={(e) => setMarks(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="grade-feedback">Feedback (optional)</Label>
            <Textarea id="grade-feedback" value={feedback} onChange={(e) => setFeedback(e.target.value)} className="min-h-20" placeholder="Great work on…" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Save grade
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
