import { useEffect, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarClock, ClipboardCheck, FileText, NotebookPen, Users } from "lucide-react";
import { useAppState } from "@/app/providers/app-state";
import { useActorParams } from "@/hooks/use-actor-params";
import {
  getHomeworkActivity,
  getHomeworkAttachmentUrl,
  getHomeworkById,
  recordHomeworkView,
} from "@/rpc/homework";
import { getSubmissionFileUrl, listSubmissionsFor } from "@/rpc/submissions";
import { EmptyState, ErrorState, LoadingCards } from "@/components/feedback/states";
import { FloatingAI } from "@/components/feedback/floating-ai";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ActivityTable, type ActivityRow } from "@/components/shwai/activity-table";
import { AttachmentList } from "@/components/shwai/attachment-list";
import { SubmitHomeworkForm } from "@/components/shwai/submit-homework-form";
import { GradeSubmissionDialog } from "@/components/shwai/grade-submission-dialog";
import { formatDateTime, isOverdue } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/homework/$homeworkId")({ component: HomeworkDetail });

function HomeworkDetail() {
  useAppState();
  const { homeworkId } = Route.useParams();
  const actorParams = useActorParams();
  const viewRecorded = useRef(false);

  const homeworkQuery = useQuery({
    queryKey: ["homework", "detail", actorParams, homeworkId],
    queryFn: () => getHomeworkById({ data: { ...actorParams!, homeworkId } }),
    enabled: Boolean(actorParams),
    retry: false,
  });

  useEffect(() => {
    if (actorParams?.role === "student" && homeworkQuery.data && !viewRecorded.current) {
      viewRecorded.current = true;
      recordHomeworkView({ data: { ...actorParams, homeworkId } }).catch(() => {});
    }
  }, [actorParams, homeworkQuery.data, homeworkId]);

  const activityQuery = useQuery({
    queryKey: ["homework-activity", actorParams, homeworkId],
    queryFn: () => getHomeworkActivity({ data: { ...actorParams!, homeworkId } }),
    enabled: Boolean(actorParams) && actorParams?.role !== "student" && Boolean(homeworkQuery.data),
  });

  const submissionsQuery = useQuery({
    queryKey: ["submissions", actorParams, homeworkId],
    queryFn: () => listSubmissionsFor({ data: { ...actorParams!, homeworkId } }),
    enabled: Boolean(actorParams) && actorParams?.role !== "student" && Boolean(homeworkQuery.data),
  });

  if (!actorParams) {
    return (
      <EmptyState
        title="Not available for your role"
        description="Homework workflows are available to students, teachers and the principal."
        icon={<NotebookPen className="size-6" aria-hidden />}
      />
    );
  }

  if (homeworkQuery.isLoading) {
    return <LoadingCards count={3} />;
  }

  if (homeworkQuery.isError || !homeworkQuery.data) {
    return (
      <ErrorState
        message={(homeworkQuery.error as Error)?.message ?? "This homework could not be found."}
        onRetry={() => homeworkQuery.refetch()}
      />
    );
  }

  const hw = homeworkQuery.data;
  const overdue = isOverdue(hw.dueAt);
  const canSubmit = actorParams.role === "student" && (!hw.viewerSubmission || hw.allowResubmission);

  const activityRows: ActivityRow[] =
    activityQuery.data?.rows.map((r) => ({
      id: r.studentId,
      name: r.studentName,
      viewed: r.viewed,
      firstViewedAt: r.firstViewedAt,
      extra: r.submitted
        ? { label: r.submissionStatus === "late" ? "Late" : r.submissionStatus === "graded" ? "Graded" : "Submitted", status: r.submissionStatus === "late" ? "late" : "submitted" }
        : { label: "Not submitted", status: "pending" },
    })) ?? [];

  return (
    <div className="relative space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/app/homework">
          <ArrowLeft className="size-4" aria-hidden /> Back to homework
        </Link>
      </Button>

      <header className="surface-panel space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="rounded-full border-primary/30 bg-primary-soft text-[11px] text-primary">
                {hw.subject}
              </Badge>
              <Badge variant="outline" className="rounded-full text-[11px] text-muted-foreground">
                {hw.classLabel}
              </Badge>
            </div>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-balance">{hw.title}</h1>
            <p className="mt-1 text-xs text-muted-foreground">Assigned by {hw.teacherName}</p>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "rounded-full text-[11px]",
              overdue ? "border-danger/30 bg-danger-soft text-danger" : "border-success/30 bg-success-soft text-success",
            )}
          >
            <CalendarClock className="mr-1 size-3" aria-hidden />
            {overdue ? "Overdue" : "Due"} {formatDateTime(hw.dueAt)}
          </Badge>
        </div>

        <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{hw.description}</p>

        {hw.totalMarks != null ? <p className="text-xs text-muted-foreground">Total marks: {hw.totalMarks}</p> : null}

        {hw.attachments.length > 0 ? (
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <FileText className="size-3.5" aria-hidden /> Attachments
            </p>
            <AttachmentList
              files={hw.attachments}
              getUrl={(filePath) => getHomeworkAttachmentUrl({ data: { ...actorParams, homeworkId, filePath } }).then((r) => r.url)}
            />
          </div>
        ) : null}
      </header>

      {actorParams.role === "student" ? (
        <div className="surface-panel space-y-4 p-5 sm:p-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Your submission</h2>
          {hw.viewerSubmission ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-full text-[11px]",
                    hw.viewerSubmission.status === "graded"
                      ? "border-success/30 bg-success-soft text-success"
                      : hw.viewerSubmission.status === "late"
                        ? "border-warning/30 bg-warning-soft text-warning"
                        : "border-border text-muted-foreground",
                  )}
                >
                  {hw.viewerSubmission.status === "graded" ? "Graded" : hw.viewerSubmission.status === "late" ? "Submitted late" : "Submitted"}
                </Badge>
                <span className="text-xs text-muted-foreground">on {formatDateTime(hw.viewerSubmission.submittedAt)}</span>
              </div>
              {hw.viewerSubmission.comment ? <p className="text-sm text-muted-foreground">{hw.viewerSubmission.comment}</p> : null}
              <AttachmentList
                files={hw.viewerSubmission.files}
                getUrl={(filePath) =>
                  getSubmissionFileUrl({ data: { ...actorParams, submissionId: hw.viewerSubmission!.id, filePath } }).then((r) => r.url)
                }
              />
              {hw.viewerSubmission.status === "graded" ? (
                <div className="rounded-lg border border-success/30 bg-success-soft p-3">
                  <p className="text-sm font-semibold text-success">
                    Marks: {hw.viewerSubmission.marks ?? "—"}
                    {hw.totalMarks ? ` / ${hw.totalMarks}` : ""}
                  </p>
                  {hw.viewerSubmission.feedback ? <p className="mt-1 text-sm text-muted-foreground">{hw.viewerSubmission.feedback}</p> : null}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">You haven't submitted this yet.</p>
          )}

          {canSubmit ? (
            <>
              {hw.viewerSubmission ? <Separator /> : null}
              <SubmitHomeworkForm actorId={actorParams.actorId} homeworkId={homeworkId} isResubmission={Boolean(hw.viewerSubmission)} />
            </>
          ) : null}
        </div>
      ) : (
        <>
          <div className="surface-panel space-y-4 p-5 sm:p-6">
            <h2 className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-muted-foreground">
              <Users className="size-4" aria-hidden /> Student activity
            </h2>
            {activityQuery.isLoading ? (
              <LoadingCards count={4} />
            ) : activityQuery.isError ? (
              <ErrorState message={(activityQuery.error as Error)?.message} onRetry={() => activityQuery.refetch()} />
            ) : (
              <ActivityTable rows={activityRows} showSubmissions />
            )}
          </div>

          <div className="surface-panel space-y-4 p-5 sm:p-6">
            <h2 className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-muted-foreground">
              <ClipboardCheck className="size-4" aria-hidden /> Submissions
            </h2>
            {submissionsQuery.isLoading ? (
              <LoadingCards count={4} />
            ) : submissionsQuery.isError ? (
              <ErrorState message={(submissionsQuery.error as Error)?.message} onRetry={() => submissionsQuery.refetch()} />
            ) : (submissionsQuery.data ?? []).length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No submissions yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {submissionsQuery.data!.map((sub) => (
                  <li key={sub.id} className="flex flex-wrap items-start justify-between gap-3 py-4 first:pt-0 last:pb-0">
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{sub.studentName}</p>
                        <Badge
                          variant="outline"
                          className={cn(
                            "rounded-full text-[11px]",
                            sub.status === "graded"
                              ? "border-success/30 bg-success-soft text-success"
                              : sub.status === "late"
                                ? "border-warning/30 bg-warning-soft text-warning"
                                : "border-border text-muted-foreground",
                          )}
                        >
                          {sub.status === "graded" ? `Graded${sub.marks != null ? ` · ${sub.marks}${hw.totalMarks ? `/${hw.totalMarks}` : ""}` : ""}` : sub.status === "late" ? "Late" : "Submitted"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">on {formatDateTime(sub.submittedAt)}</p>
                      {sub.comment ? <p className="text-sm text-muted-foreground">{sub.comment}</p> : null}
                      <AttachmentList
                        files={sub.files}
                        getUrl={(filePath) => getSubmissionFileUrl({ data: { ...actorParams, submissionId: sub.id, filePath } }).then((r) => r.url)}
                      />
                    </div>
                    {actorParams.role === "teacher" ? (
                      <GradeSubmissionDialog role="teacher" actorId={actorParams.actorId} submission={sub} totalMarks={hw.totalMarks} />
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
      <FloatingAI />
    </div>
  );
}
