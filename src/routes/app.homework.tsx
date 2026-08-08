import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { NotebookPen, Clock, Users, Eye, CheckCircle2, MoreVertical, Trash2, Pencil } from "lucide-react";
import { useAppState } from "@/app/providers/app-state";
import { useActorParams } from "@/hooks/use-actor-params";
import { listHomeworkFor, deleteHomework } from "@/server/homework";
import { TEACHERS } from "@/data/mock/people";
import { CLASS_SECTIONS } from "@/data/mock/core";
import { EmptyState, ErrorState, LoadingCards } from "@/components/feedback/states";
import { FloatingAI } from "@/components/feedback/floating-ai";
import { HomeworkFormDialog } from "@/components/shwai/homework-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, isOverdue } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { HomeworkItem } from "@/types";
import { toast } from "sonner";

export const Route = createFileRoute("/app/homework")({ component: HomeworkList });

function statusMeta(hw: HomeworkItem) {
  if (hw.viewerSubmission?.status === "graded") return { label: `Graded${hw.viewerSubmission.marks != null ? ` · ${hw.viewerSubmission.marks}${hw.totalMarks ? `/${hw.totalMarks}` : ""}` : ""}`, tone: "success" as const };
  if (hw.viewerSubmission?.status === "late") return { label: "Submitted late", tone: "warning" as const };
  if (hw.viewerSubmission?.status === "submitted") return { label: "Submitted", tone: "success" as const };
  if (isOverdue(hw.dueAt)) return { label: "Overdue", tone: "danger" as const };
  return { label: "Pending", tone: "muted" as const };
}

const TONE_CLASSES: Record<string, string> = {
  success: "border-success/30 bg-success-soft text-success",
  warning: "border-warning/30 bg-warning-soft text-warning",
  danger: "border-danger/30 bg-danger-soft text-danger",
  muted: "border-border text-muted-foreground",
};

function HomeworkList() {
  useAppState();
  const actorParams = useActorParams();
  const queryClient = useQueryClient();
  const [studentFilter, setStudentFilter] = useState<"all" | "pending" | "done">("all");

  const teacherClassOptions = useMemo(() => {
    if (actorParams?.role !== "teacher") return [];
    const teacher = TEACHERS.find((t) => t.id === actorParams.actorId);
    if (!teacher) return [];
    return CLASS_SECTIONS.filter((c) => teacher.classes.includes(c.label)).map((c) => ({ id: c.id, label: c.label }));
  }, [actorParams]);

  const query = useQuery({
    queryKey: ["homework", actorParams],
    queryFn: () => listHomeworkFor({ data: actorParams! }),
    enabled: Boolean(actorParams),
  });

  const deleteMutation = useMutation({
    mutationFn: (homeworkId: string) => deleteHomework({ data: { ...actorParams!, homeworkId } }),
    onSuccess: () => {
      toast.success("Homework deleted");
      queryClient.invalidateQueries({ queryKey: ["homework"] });
    },
    onError: (err: Error) => toast.error(err.message || "Could not delete homework."),
  });

  const items = query.data ?? [];
  const visibleItems = useMemo(() => {
    if (actorParams?.role !== "student" || studentFilter === "all") return items;
    return items.filter((hw) => {
      const done = Boolean(hw.viewerSubmission);
      return studentFilter === "done" ? done : !done;
    });
  }, [items, actorParams, studentFilter]);

  return (
    <div className="relative space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Academics</p>
          <h1 className="text-3xl font-extrabold tracking-tight">Homework</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {actorParams?.role === "student"
              ? "Assignments from your teachers, submission status and grades."
              : actorParams?.role === "teacher"
                ? "Create assignments, track who has viewed and submitted, and grade work."
                : "School-wide homework activity across every class."}
          </p>
        </div>
        {actorParams?.role === "teacher" ? (
          <HomeworkFormDialog role="teacher" actorId={actorParams.actorId} classOptions={teacherClassOptions} />
        ) : null}
      </header>

      {actorParams?.role === "student" ? (
        <Tabs value={studentFilter} onValueChange={(v) => setStudentFilter(v as typeof studentFilter)}>
          <TabsList className="rounded-xl bg-muted p-1">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="pending" className="text-xs">Pending</TabsTrigger>
            <TabsTrigger value="done" className="text-xs">Submitted</TabsTrigger>
          </TabsList>
        </Tabs>
      ) : null}

      {!actorParams ? (
        <EmptyState
          title="Not available for your role"
          description="Homework workflows are available to students, teachers and the principal. Ask a workspace administrator if you believe this is a mistake."
          icon={<NotebookPen className="size-6" aria-hidden />}
        />
      ) : query.isLoading ? (
        <LoadingCards count={6} />
      ) : query.isError ? (
        <ErrorState message={(query.error as Error)?.message} onRetry={() => query.refetch()} />
      ) : visibleItems.length === 0 ? (
        <EmptyState
          title={actorParams.role === "teacher" ? "No homework created yet" : "No homework assigned yet"}
          description={
            actorParams.role === "teacher"
              ? "Create your first assignment and it will appear here for your class."
              : "Your teachers haven't assigned any homework yet. Check back soon."
          }
          icon={<NotebookPen className="size-6" aria-hidden />}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleItems.map((hw) => {
            const status = actorParams.role === "student" ? statusMeta(hw) : null;
            return (
              <div key={hw.id} className="surface-panel group relative flex flex-col gap-3 p-5">
                <Link to="/app/homework/$homeworkId" params={{ homeworkId: hw.id }} className="absolute inset-0 z-0" aria-label={hw.title} />
                <div className="relative z-10 flex items-start justify-between gap-2">
                  <Badge variant="outline" className="rounded-full text-[11px] text-primary border-primary/30 bg-primary-soft">
                    {hw.subject}
                  </Badge>
                  {actorParams.role === "teacher" ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="relative z-10 size-7"
                          onClick={(e) => e.stopPropagation()}
                          aria-label="Homework actions"
                        >
                          <MoreVertical className="size-4" aria-hidden />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <HomeworkFormDialog
                          role="teacher"
                          actorId={actorParams.actorId}
                          homework={hw}
                          trigger={
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Pencil className="size-3.5" aria-hidden /> Edit
                            </DropdownMenuItem>
                          }
                        />
                        <ConfirmDeleteHomework title={hw.title} onConfirm={() => deleteMutation.mutate(hw.id)} />
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : status ? (
                    <Badge variant="outline" className={cn("relative z-10 rounded-full text-[11px]", TONE_CLASSES[status.tone])}>
                      {status.label}
                    </Badge>
                  ) : null}
                </div>
                <div className="relative z-10">
                  <h3 className="text-balance text-base font-bold leading-snug">{hw.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{hw.classLabel}</p>
                </div>
                <p className="relative z-10 line-clamp-2 text-sm text-muted-foreground">{hw.description}</p>
                <div className="relative z-10 mt-auto flex flex-wrap items-center gap-3 pt-2 text-xs text-muted-foreground">
                  <span className={cn("flex items-center gap-1", isOverdue(hw.dueAt) && actorParams.role !== "student" && "text-danger")}>
                    <Clock className="size-3.5" aria-hidden /> Due {formatDate(hw.dueAt)}
                  </span>
                  {actorParams.role !== "student" ? (
                    <>
                      <span className="flex items-center gap-1">
                        <Users className="size-3.5" aria-hidden /> {hw.assignedCount ?? 0} assigned
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="size-3.5" aria-hidden /> {hw.viewedCount ?? 0} viewed
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="size-3.5" aria-hidden /> {hw.submittedCount ?? 0} submitted
                      </span>
                    </>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <FloatingAI />
    </div>
  );
}

function ConfirmDeleteHomework({ title, onConfirm }: { title: string; onConfirm: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <DropdownMenuItem
        className="text-danger focus:text-danger"
        onSelect={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
      >
        <Trash2 className="size-3.5" aria-hidden /> Delete
      </DropdownMenuItem>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete "{title}"?</AlertDialogTitle>
          <AlertDialogDescription>
            Students will no longer see this assignment. Existing submissions and grades stay in your records but won't be reachable from the app.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-danger text-white hover:bg-danger/90"
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
