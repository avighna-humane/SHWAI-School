import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Megaphone,
  CalendarClock,
  Users,
  Eye,
  Trash2,
  Plus,
  Loader2,
  FileText,
  CheckCircle2,
  X,
} from "lucide-react";
import { useAppState } from "@/app/providers/app-state";
import { useActorParams } from "@/hooks/use-actor-params";
import type { NoticeAudienceType } from "@/types";
import {
  listNoticesFor,
  listMyNoticesFor,
  listTeacherNoticesFor,
  createNotice,
  deleteNotice,
  recordNoticeView,
  getNoticeActivity,
} from "@/rpc/notices";
import { CLASS_SECTIONS } from "@/data/mock/core";
import { TEACHERS, STUDENTS } from "@/data/mock/people";
import { EmptyState, ErrorState, LoadingCards } from "@/components/feedback/states";
import { FloatingAI } from "@/components/feedback/floating-ai";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AttachmentList } from "@/components/shwai/attachment-list";

export const Route = createFileRoute("/app/announcements")({ component: AnnouncementsPage });

function AnnouncementsPage() {
  const { role } = useAppState();
  const actorParams = useActorParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"notices" | "my-notices" | "teacher-notices">(
    "notices",
  );
  const [selectedNotice, setSelectedNotice] = useState<any>(null);
  const [activityNoticeId, setActivityNoticeId] = useState<string | null>(null);

  // Queries
  const noticesQuery = useQuery({
    queryKey: ["notices", "feed", actorParams],
    queryFn: () => listNoticesFor({ data: actorParams! }),
    enabled: Boolean(actorParams),
  });

  const myNoticesQuery = useQuery({
    queryKey: ["notices", "my", actorParams],
    queryFn: () => listMyNoticesFor({ data: actorParams! }),
    enabled: Boolean(actorParams) && (role === "teacher" || role === "principal"),
  });

  const staffNoticesQuery = useQuery({
    queryKey: ["notices", "staff", actorParams],
    queryFn: () => listTeacherNoticesFor({ data: actorParams! }),
    enabled: Boolean(actorParams) && (role === "teacher" || role === "principal"),
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: (noticeId: string) => deleteNotice({ data: { ...actorParams!, noticeId } }),
    onSuccess: () => {
      toast.success("Notice deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["notices"] });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to delete notice"),
  });

  const viewMutation = useMutation({
    mutationFn: (noticeId: string) => recordNoticeView({ data: { ...actorParams!, noticeId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notices"] });
    },
  });

  if (!actorParams) {
    return (
      <EmptyState
        title="Unauthorized Access"
        description="Please select a valid identity inside Settings to access notices."
        icon={<Megaphone className="size-6" />}
      />
    );
  }

  const handleOpenNotice = (notice: any) => {
    setSelectedNotice(notice);
    if (!notice.viewerHasViewed && role !== "principal") {
      viewMutation.mutate(notice.id);
    }
  };

  return (
    <div className="relative space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
            Engagement
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight">Announcements</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            View notices, updates, circulars, and teacher-principal communication channels.
          </p>
        </div>
        {(role === "teacher" || role === "principal") && (
          <CreateNoticeDialog actorId={actorParams.actorId} role={role} />
        )}
      </header>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        <TabsList className="rounded-xl bg-card p-1 shadow-sm border border-border/50">
          <TabsTrigger value="notices" className="text-xs">
            School notices
          </TabsTrigger>
          {(role === "teacher" || role === "principal") && (
            <TabsTrigger value="my-notices" className="text-xs">
              My notices
            </TabsTrigger>
          )}
          {(role === "teacher" || role === "principal") && (
            <TabsTrigger value="teacher-notices" className="text-xs">
              {role === "principal" ? "Teacher Posts (Principal)" : "Principal posts"}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="notices">
          {noticesQuery.isLoading ? (
            <LoadingCards count={4} />
          ) : noticesQuery.isError ? (
            <ErrorState
              message={(noticesQuery.error as Error)?.message}
              onRetry={() => noticesQuery.refetch()}
            />
          ) : (noticesQuery.data ?? []).length === 0 ? (
            <EmptyState
              title="No notices"
              description="There are no active notices at this moment."
              icon={<Megaphone className="size-6" />}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {(noticesQuery.data ?? []).map((notice) => (
                <NoticeCard
                  key={notice.id}
                  notice={notice}
                  onOpen={() => handleOpenNotice(notice)}
                  showUnreadBadge={role !== "principal"}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my-notices">
          {myNoticesQuery.isLoading ? (
            <LoadingCards count={4} />
          ) : myNoticesQuery.isError ? (
            <ErrorState
              message={(myNoticesQuery.error as Error)?.message}
              onRetry={() => myNoticesQuery.refetch()}
            />
          ) : (myNoticesQuery.data ?? []).length === 0 ? (
            <EmptyState
              title="No notices published"
              description="You have not created or published any notices."
              icon={<Megaphone className="size-6" />}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {(myNoticesQuery.data ?? []).map((notice) => (
                <NoticeCard
                  key={notice.id}
                  notice={notice}
                  onOpen={() => handleOpenNotice(notice)}
                  onDelete={() => deleteMutation.mutate(notice.id)}
                  onViewActivity={() => setActivityNoticeId(notice.id)}
                  showStats
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="teacher-notices">
          {staffNoticesQuery.isLoading ? (
            <LoadingCards count={4} />
          ) : staffNoticesQuery.isError ? (
            <ErrorState
              message={(staffNoticesQuery.error as Error)?.message}
              onRetry={() => staffNoticesQuery.refetch()}
            />
          ) : (staffNoticesQuery.data ?? []).length === 0 ? (
            <EmptyState
              title="No posts"
              description="No posts specifically for staff have been published."
              icon={<Megaphone className="size-6" />}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {(staffNoticesQuery.data ?? []).map((notice) => (
                <NoticeCard
                  key={notice.id}
                  notice={notice}
                  onOpen={() => handleOpenNotice(notice)}
                  onDelete={
                    role === "principal" ? () => deleteMutation.mutate(notice.id) : undefined
                  }
                  onViewActivity={
                    role === "principal" ? () => setActivityNoticeId(notice.id) : undefined
                  }
                  showStats={role === "principal"}
                  showUnreadBadge={role === "teacher"}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Notice Detail Dialog */}
      {selectedNotice && (
        <Dialog
          open={Boolean(selectedNotice)}
          onOpenChange={(open) => !open && setSelectedNotice(null)}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="rounded-full bg-primary-soft text-primary border-primary/20 text-[10px]"
                >
                  {selectedNotice.authorRole}
                </Badge>
                <Badge variant="outline" className="rounded-full text-[10px]">
                  {selectedNotice.audienceType.replace("_", " ")}
                </Badge>
              </div>
              <DialogTitle className="text-xl font-extrabold tracking-tight mt-2 text-balance">
                {selectedNotice.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Published by {selectedNotice.authorName} on{" "}
                {formatDateTime(selectedNotice.createdAt)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                {selectedNotice.body}
              </p>
              {selectedNotice.attachments && selectedNotice.attachments.length > 0 && (
                <div className="space-y-2 border-t pt-4">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <FileText className="size-3.5" /> Attachments
                  </p>
                  <AttachmentList
                    files={selectedNotice.attachments}
                    getUrl={async (path) => selectedNotice.attachments[0].filePath}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => setSelectedNotice(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Notice Activity Tracking Sheet */}
      {activityNoticeId && (
        <NoticeActivityDialog
          noticeId={activityNoticeId}
          onClose={() => setActivityNoticeId(null)}
        />
      )}

      <FloatingAI />
    </div>
  );
}

function NoticeCard({
  notice,
  onOpen,
  onDelete,
  onViewActivity,
  showStats = false,
  showUnreadBadge = false,
}: {
  notice: any;
  onOpen: () => void;
  onDelete?: () => void;
  onViewActivity?: () => void;
  showStats?: boolean;
  showUnreadBadge?: boolean;
}) {
  const hasUnread = showUnreadBadge && !notice.viewerHasViewed;
  return (
    <div className="surface-panel flex flex-col gap-3 p-5 relative group transition-all hover:border-border-strong">
      <button
        onClick={onOpen}
        className="absolute inset-0 z-0"
        aria-label={`Open notice ${notice.title}`}
      />

      <div className="relative z-10 flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge
            variant="outline"
            className="rounded-full bg-primary-soft text-primary border-primary/20 text-[10px]"
          >
            {notice.authorRole}
          </Badge>
          <Badge variant="outline" className="rounded-full text-[10px]">
            {notice.audienceType.replace("_", " ")}
          </Badge>
          {hasUnread && (
            <Badge
              variant="outline"
              className="rounded-full bg-danger-soft text-danger border-danger/20 text-[10px] animate-pulse"
            >
              New
            </Badge>
          )}
        </div>
        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="size-7 hover:bg-danger/10 hover:text-danger relative z-10 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>

      <div className="relative z-10">
        <h3 className="text-balance text-base font-bold leading-snug group-hover:text-primary transition-colors">
          {notice.title}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">By {notice.authorName}</p>
      </div>

      <p className="relative z-10 line-clamp-2 text-sm text-muted-foreground leading-relaxed">
        {notice.body}
      </p>

      <div className="relative z-10 mt-auto flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/40 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <CalendarClock className="size-3.5" /> {formatDateTime(notice.createdAt)}
        </span>
        {showStats && (
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5" title="Total targeted audience size">
              <Users className="size-3.5" /> {notice.recipientCount ?? 0}
            </span>
            <span className="flex items-center gap-1.5" title="Opened notice count">
              <Eye className="size-3.5" /> {notice.viewedCount ?? 0}
            </span>
            {onViewActivity && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 hover:bg-primary-soft text-primary font-semibold text-[11px]"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewActivity();
                }}
              >
                Track read
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CreateNoticeDialog({ actorId, role }: { actorId?: string; role: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audienceType, setAudienceType] = useState<NoticeAudienceType>("all_students");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const queryClient = useQueryClient();

  const isPrincipal = role === "principal";

  const mutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.set("role", role);
      if (actorId) formData.set("actorId", actorId);
      formData.set("title", title.trim());
      formData.set("body", body.trim());
      formData.set("audienceType", audienceType);

      if (audienceType === "class") {
        formData.set("audienceClassIds", JSON.stringify([selectedClassId]));
      } else if (audienceType === "specific_teachers") {
        formData.set("audienceTeacherIds", JSON.stringify([selectedTeacherId]));
      } else if (audienceType === "specific_students") {
        formData.set("audienceStudentIds", JSON.stringify([selectedStudentId]));
      }

      if (attachment) formData.set("attachment", attachment);

      return createNotice({ data: formData });
    },
    onSuccess: () => {
      toast.success("Notice published successfully");
      queryClient.invalidateQueries({ queryKey: ["notices"] });
      setOpen(false);
      setTitle("");
      setBody("");
      setAttachment(null);
    },
    onError: (err: Error) => toast.error(err.message || "Failed to publish notice"),
  });

  const canSubmit =
    title.trim() &&
    body.trim() &&
    (audienceType === "all_students" ||
      audienceType === "all_teachers" ||
      audienceType === "school" ||
      (audienceType === "class" && selectedClassId) ||
      (audienceType === "specific_teachers" && selectedTeacherId) ||
      (audienceType === "specific_students" && selectedStudentId));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" /> Publish notice
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Publish new notice</DialogTitle>
          <DialogDescription>
            Create a general notice or target specific classes and teachers.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="notice-title">Notice Title</Label>
            <Input
              id="notice-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Schedule for half-yearly exams"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notice-body">Content</Label>
            <Textarea
              id="notice-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write notice details here…"
              className="min-h-28"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notice-audience">Target Audience</Label>
            <select
              id="notice-audience"
              value={audienceType}
              onChange={(e) => setAudienceType(e.target.value as any)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {isPrincipal && <option value="school">All school</option>}
              <option value="all_students">All Students</option>
              <option value="class">A specific class</option>
              <option value="specific_students">Specific student</option>
              {isPrincipal && <option value="all_teachers">All Teachers</option>}
              {isPrincipal && <option value="specific_teachers">Specific teacher</option>}
            </select>
          </div>

          {audienceType === "class" && (
            <div className="space-y-1.5">
              <Label htmlFor="notice-target-class">Select Class</Label>
              <select
                id="notice-target-class"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Select class...</option>
                {CLASS_SECTIONS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {audienceType === "specific_teachers" && (
            <div className="space-y-1.5">
              <Label htmlFor="notice-target-teacher">Select Teacher</Label>
              <select
                id="notice-target-teacher"
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Select teacher...</option>
                {TEACHERS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {audienceType === "specific_students" && (
            <div className="space-y-1.5">
              <Label htmlFor="notice-target-student">Select Student</Label>
              <select
                id="notice-target-student"
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Select student...</option>
                {STUDENTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.grade} {s.section}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="notice-attachment">Optional attachment</Label>
            <Input
              id="notice-attachment"
              type="file"
              onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
              className="h-9 bg-background"
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={!canSubmit || mutation.isPending}>
              {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Publish notice
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NoticeActivityDialog({ noticeId, onClose }: { noticeId: string; onClose: () => void }) {
  const actorParams = useActorParams();
  const query = useQuery({
    queryKey: ["notice-activity", actorParams, noticeId],
    queryFn: () => getNoticeActivity({ data: { ...actorParams!, noticeId } }),
    enabled: Boolean(actorParams),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader className="flex flex-row items-center justify-between border-b pb-3">
          <div>
            <DialogTitle className="text-lg font-bold">Notice read receipts</DialogTitle>
            <DialogDescription className="text-xs">
              Track who opened this notice and when.
            </DialogDescription>
          </div>
          <Button variant="ghost" size="icon" className="size-8" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </DialogHeader>

        {query.isLoading ? (
          <div className="py-10 text-center">
            <Loader2 className="size-6 animate-spin mx-auto text-primary" />
            <p className="text-xs text-muted-foreground mt-2">Loading read activity...</p>
          </div>
        ) : query.isError ? (
          <div className="py-6 text-center text-sm text-danger">
            {(query.error as Error)?.message}
          </div>
        ) : !query.data ? (
          <div className="py-6 text-center text-sm text-muted-foreground">No data found.</div>
        ) : (
          <div className="space-y-4 pt-3">
            <div className="flex items-center gap-4 bg-muted/50 rounded-lg p-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wide">
                  Target recipients
                </p>
                <p className="text-xl font-extrabold">{query.data.recipientCount}</p>
              </div>
              <div className="border-l pl-4">
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wide">
                  Opened / Read
                </p>
                <p className="text-xl font-extrabold text-success">{query.data.viewedCount}</p>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2.5 divide-y divide-border/40">
              {query.data.rows.map((row) => (
                <div
                  key={row.viewerId}
                  className="flex items-center justify-between py-2 first:pt-0"
                >
                  <div>
                    <p className="text-sm font-semibold">{row.viewerName}</p>
                    {row.viewed && row.firstViewedAt ? (
                      <p className="text-[11px] text-muted-foreground">
                        First read: {formatDateTime(row.firstViewedAt)}
                      </p>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">Not viewed yet</p>
                    )}
                  </div>
                  {row.viewed ? (
                    <Badge
                      variant="outline"
                      className="rounded-full bg-success-soft text-success border-success/20 text-[10px] gap-1"
                    >
                      <CheckCircle2 className="size-3" /> Read ({row.viewCount})
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="rounded-full text-[10px] text-muted-foreground"
                    >
                      Pending
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
