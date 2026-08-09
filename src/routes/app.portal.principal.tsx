import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
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
  Presentation,
  UserCheck,
  ClipboardCheck,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Sliders,
  Sparkles,
  FileKey
} from "lucide-react";
import { useAppState } from "@/app/providers/app-state";
import { useActorParams } from "@/hooks/use-actor-params";
import {
  listMyNoticesFor,
  listTeacherNoticesFor,
  createNotice,
  deleteNotice,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatDateTime, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AttachmentList } from "@/components/shwai/attachment-list";

export const Route = createFileRoute("/app/portal/principal")({ component: PrincipalPortalPage });

function PrincipalPortalPage() {
  const { role } = useAppState();
  const actorParams = useActorParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"overview" | "notices" | "teacher-posts">("overview");
  const [activityNoticeId, setActivityNoticeId] = useState<string | null>(null);

  // Queries
  const noticesQuery = useQuery({
    queryKey: ["notices", "principal-general", actorParams],
    queryFn: () => listMyNoticesFor({ data: actorParams! }),
    enabled: Boolean(actorParams) && role === "principal",
  });

  const teacherPostsQuery = useQuery({
    queryKey: ["notices", "principal-teacher-posts", actorParams],
    queryFn: () => listTeacherNoticesFor({ data: actorParams! }),
    enabled: Boolean(actorParams) && role === "principal",
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: (noticeId: string) => deleteNotice({ data: { ...actorParams!, noticeId } }),
    onSuccess: () => {
      toast.success("Post deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["notices"] });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to delete post"),
  });

  if (role !== "principal") {
    return (
      <EmptyState
        title="Access Denied"
        description="The principal portal is only accessible to accounts acting as a Principal/Admin. Go to Settings or the top avatar menu to switch your role to Principal."
        icon={<Sliders className="size-6" />}
      />
    );
  }

  const schoolNotices = noticesQuery.data ?? [];
  const teacherPosts = teacherPostsQuery.data ?? [];

  return (
    <div className="relative space-y-6">
      {/* Principal Header */}
      <header className="surface-panel flex flex-col gap-4 p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary font-bold text-lg border border-primary/20">
            VP
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight">Dr. Vikram Nair</h1>
              <Badge variant="outline" className="rounded-full bg-ai-soft text-ai border-ai/20 text-[10px]">
                Principal / Admin Workspace
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              School-wide administrative control dashboard · CBSE Board
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="rounded-xl border bg-muted/30 p-2.5 px-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Students</p>
            <p className="text-lg font-black text-primary">{STUDENTS.length}</p>
          </div>
          <div className="rounded-xl border bg-muted/30 p-2.5 px-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Teachers</p>
            <p className="text-lg font-black text-success">{TEACHERS.length}</p>
          </div>
          <div className="rounded-xl border bg-muted/30 p-2.5 px-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Classes</p>
            <p className="text-lg font-black text-info">{CLASS_SECTIONS.length}</p>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        <TabsList className="flex flex-wrap rounded-xl bg-card p-1 shadow-sm border border-border/50">
          <TabsTrigger value="overview" className="text-xs gap-1.5"><Sparkles className="size-3.5" /> School Overview</TabsTrigger>
          <TabsTrigger value="notices" className="text-xs gap-1.5"><Megaphone className="size-3.5" /> General Notices ({schoolNotices.length})</TabsTrigger>
          <TabsTrigger value="teacher-posts" className="text-xs gap-1.5"><Presentation className="size-3.5" /> Teacher-Only Posts ({teacherPosts.length})</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <UserCheck className="size-4 text-success" /> Attendance Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-black text-success">94.8%</p>
                <p className="text-xs text-muted-foreground mt-1">Average school-wide attendance this term.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <ClipboardCheck className="size-4 text-primary" /> Learning Debt Map
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-black text-primary">0% Critical</p>
                <p className="text-xs text-muted-foreground mt-1">All grade curriculums are running fully on track.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <BookOpen className="size-4 text-info" /> Homework Submissions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-black text-info">91%</p>
                <p className="text-xs text-muted-foreground mt-1">Average classroom homework completion rate.</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* General Notices Tab */}
        <TabsContent value="notices" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center pb-3">
              <div>
                <CardTitle className="text-lg font-bold">General School Notices</CardTitle>
                <CardDescription>Notices and circulars published school-wide for parents and students.</CardDescription>
              </div>
              <Button asChild size="sm">
                <Link to="/app/announcements">Publish notice</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {noticesQuery.isLoading ? (
                <LoadingCards count={4} />
              ) : schoolNotices.length === 0 ? (
                <EmptyState title="No notices published" description="You have not published any general school notices." icon={<Megaphone className="size-6" />} />
              ) : (
                <div className="space-y-4">
                  {schoolNotices.map((n: any) => (
                    <div key={n.id} className="p-4 border rounded-xl flex justify-between items-start gap-4 bg-card hover:bg-muted/10 transition-colors">
                      <div className="space-y-1.5">
                        <h3 className="font-bold text-base text-primary">{n.title}</h3>
                        <p className="text-sm text-muted-foreground">{n.body}</p>
                        <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                          <CalendarClock className="size-3.5" /> Published on {formatDateTime(n.createdAt)}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right text-xs text-muted-foreground mr-1">
                          <p className="font-bold text-foreground">Opened {n.viewedCount ?? 0} / {n.recipientCount ?? 0}</p>
                          <button onClick={() => setActivityNoticeId(n.id)} className="text-primary hover:underline font-semibold text-[10px] mt-1 block">
                            Track Read
                          </button>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-danger hover:bg-danger/10"
                          onClick={() => deleteMutation.mutate(n.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Teacher Posts Tab */}
        <TabsContent value="teacher-posts" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center pb-3">
              <div>
                <CardTitle className="text-lg font-bold">Principal-to-Teacher Posts</CardTitle>
                <CardDescription>Directives, posts and official materials targeted exclusively to school staff.</CardDescription>
              </div>
              <Button asChild size="sm">
                <Link to="/app/announcements">Publish staff notice</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {teacherPostsQuery.isLoading ? (
                <LoadingCards count={4} />
              ) : teacherPosts.length === 0 ? (
                <EmptyState title="No staff posts published" description="You have not published any posts specifically for teachers." icon={<Megaphone className="size-6" />} />
              ) : (
                <div className="space-y-4">
                  {teacherPosts.map((n: any) => (
                    <div key={n.id} className="p-4 border rounded-xl flex justify-between items-start gap-4 bg-card hover:bg-muted/10 transition-colors">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-base text-primary">{n.title}</h3>
                          <Badge variant="outline" className="text-[9px] rounded-full">Staff</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{n.body}</p>
                        {n.attachments && n.attachments.length > 0 && (
                          <div className="space-y-1.5 border-t pt-2.5 mt-2">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                              <FileText className="size-3" /> Attached files
                            </p>
                            <AttachmentList files={n.attachments} getUrl={async () => n.attachments[0].filePath} />
                          </div>
                        )}
                        <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 pt-1.5">
                          <CalendarClock className="size-3.5" /> Published on {formatDateTime(n.createdAt)}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 ml-4">
                        <div className="text-right text-xs text-muted-foreground mr-1">
                          <p className="font-bold text-foreground">Read: {n.viewedCount ?? 0} / {n.recipientCount ?? 0}</p>
                          <button onClick={() => setActivityNoticeId(n.id)} className="text-primary hover:underline font-semibold text-[10px] mt-1 block">
                            Track Read
                          </button>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-danger hover:bg-danger/10"
                          onClick={() => deleteMutation.mutate(n.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Readreceipt Analytics modal */}
      {activityNoticeId && (
        <NoticeActivityDialog noticeId={activityNoticeId} onClose={() => setActivityNoticeId(null)} />
      )}

      <FloatingAI />
    </div>
  );
}

function NoticeActivityDialog({ noticeId, onClose }: { noticeId: string; onClose: () => void }) {
  const actorParams = useActorParams();
  const query = useQuery({
    queryKey: ["notice-activity-principal", actorParams, noticeId],
    queryFn: () => getNoticeActivity({ data: { ...actorParams!, noticeId } }),
    enabled: Boolean(actorParams),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader className="flex flex-row items-center justify-between border-b pb-3">
          <div>
            <DialogTitle className="text-lg font-bold">Read receipt analytics</DialogTitle>
            <DialogDescription className="text-xs">Detailed audit register of opened notices.</DialogDescription>
          </div>
          <Button variant="ghost" size="icon" className="size-8" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </DialogHeader>

        {query.isLoading ? (
          <div className="py-10 text-center">
            <Loader2 className="size-6 animate-spin mx-auto text-primary" />
            <p className="text-xs text-muted-foreground mt-2">Loading activity...</p>
          </div>
        ) : query.isError ? (
          <div className="py-6 text-center text-sm text-danger">{(query.error as Error)?.message}</div>
        ) : !query.data ? (
          <div className="py-6 text-center text-sm text-muted-foreground">No records found.</div>
        ) : (
          <div className="space-y-4 pt-3">
            <div className="flex items-center gap-4 bg-muted/50 rounded-lg p-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wide">Target recipients</p>
                <p className="text-xl font-extrabold">{query.data.recipientCount}</p>
              </div>
              <div className="border-l pl-4">
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wide">Opened / Read</p>
                <p className="text-xl font-extrabold text-success">{query.data.viewedCount}</p>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2.5 divide-y divide-border/40">
              {query.data.rows.map((row) => (
                <div key={row.viewerId} className="flex items-center justify-between py-2 first:pt-0">
                  <div>
                    <p className="text-sm font-semibold">{row.viewerName}</p>
                    {row.viewed && row.firstViewedAt ? (
                      <p className="text-[11px] text-muted-foreground">First read: {formatDateTime(row.firstViewedAt)}</p>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">Not viewed yet</p>
                    )}
                  </div>
                  {row.viewed ? (
                    <Badge variant="outline" className="rounded-full bg-success-soft text-success border-success/20 text-[10px] gap-1">
                      <CheckCircle2 className="size-3" /> Read ({row.viewCount})
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="rounded-full text-[10px] text-muted-foreground">
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
