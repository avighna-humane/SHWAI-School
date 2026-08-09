import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import { Switch } from "@/components/ui/switch";
import { FilePicker } from "@/components/shwai/file-picker";
import { createHomework, updateHomework } from "@/rpc/homework";
import type { ActorRole } from "@/rpc/auth-context";
import type { HomeworkItem } from "@/types";
import { Loader2, Plus } from "lucide-react";

interface ClassOption {
  id: string;
  label: string;
}

/** Converts an ISO datetime to the value a native datetime-local input expects (local time, no seconds/zone). */
function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function HomeworkFormDialog({
  role,
  actorId,
  classOptions,
  homework,
  trigger,
}: {
  role: ActorRole;
  actorId?: string;
  classOptions?: ClassOption[];
  /** Pass to edit an existing homework instead of creating a new one. */
  homework?: HomeworkItem;
  trigger?: React.ReactNode;
}) {
  const isEdit = Boolean(homework);
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState(homework?.subject ?? "");
  const [classId, setClassId] = useState(homework?.classId ?? classOptions?.[0]?.id ?? "");
  const [title, setTitle] = useState(homework?.title ?? "");
  const [description, setDescription] = useState(homework?.description ?? "");
  const [dueAt, setDueAt] = useState(homework ? toDatetimeLocalValue(homework.dueAt) : "");
  const [totalMarks, setTotalMarks] = useState(homework?.totalMarks?.toString() ?? "");
  const [allowResubmission, setAllowResubmission] = useState(homework?.allowResubmission ?? false);
  const [files, setFiles] = useState<File[]>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open) return;
    setSubject(homework?.subject ?? "");
    setClassId(homework?.classId ?? classOptions?.[0]?.id ?? "");
    setTitle(homework?.title ?? "");
    setDescription(homework?.description ?? "");
    setDueAt(homework ? toDatetimeLocalValue(homework.dueAt) : "");
    setTotalMarks(homework?.totalMarks?.toString() ?? "");
    setAllowResubmission(homework?.allowResubmission ?? false);
    setFiles([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const mutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.set("role", role);
      if (actorId) formData.set("actorId", actorId);
      formData.set("subject", subject.trim());
      formData.set("title", title.trim());
      formData.set("description", description.trim());
      formData.set("dueAt", new Date(dueAt).toISOString());
      if (totalMarks) formData.set("totalMarks", totalMarks);
      formData.set("allowResubmission", String(allowResubmission));
      for (const file of files) formData.append("attachments", file);

      if (isEdit && homework) {
        formData.set("homeworkId", homework.id);
        return updateHomework({ data: formData });
      }
      formData.set("classId", classId);
      return createHomework({ data: formData });
    },
    onSuccess: () => {
      toast.success(isEdit ? "Homework updated" : "Homework created");
      queryClient.invalidateQueries({ queryKey: ["homework"] });
      setOpen(false);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Something went wrong.");
    },
  });

  const canSubmit = subject.trim() && title.trim() && description.trim() && dueAt && (isEdit || classId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="size-4" aria-hidden /> Create homework
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit homework" : "Create homework"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update the details of this assignment." : "Assign a new homework to one of your classes."}
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          {!isEdit ? (
            <div className="space-y-1.5">
              <Label htmlFor="hw-class">Class</Label>
              <select
                id="hw-class"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {classOptions?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="hw-subject">Subject</Label>
            <Input id="hw-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Mathematics" required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="hw-title">Title</Label>
            <Input id="hw-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Chapter 4 — Practice worksheet" required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="hw-description">Instructions</Label>
            <Textarea
              id="hw-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what students need to do…"
              className="min-h-24"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="hw-due">Due date & time</Label>
              <Input id="hw-due" type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hw-marks">Total marks (optional)</Label>
              <Input id="hw-marks" type="number" min={0} value={totalMarks} onChange={(e) => setTotalMarks(e.target.value)} placeholder="e.g. 20" />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Allow resubmission</p>
              <p className="text-xs text-muted-foreground">Students can replace their submission before grading.</p>
            </div>
            <Switch checked={allowResubmission} onCheckedChange={setAllowResubmission} aria-label="Allow resubmission" />
          </div>

          <div className="space-y-1.5">
            <Label>{isEdit ? "Add more attachments (optional)" : "Attachments (optional)"}</Label>
            <FilePicker files={files} onChange={setFiles} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={!canSubmit || mutation.isPending}>
              {mutation.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {isEdit ? "Save changes" : "Create homework"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
