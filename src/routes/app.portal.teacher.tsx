import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  SquarePen,
  CalendarDays,
  CheckCircle2,
  Clock,
  MessageSquare,
  Sparkles,
  Users,
  GraduationCap,
  ClipboardCheck,
  Send,
  Loader2,
  AlertTriangle,
  Paperclip,
  Megaphone,
  BookOpen,
  Plus,
  ArrowRight,
  Eye,
  Check,
  Award,
  ChevronRight,
  ExternalLink
} from "lucide-react";
import { useAppState } from "@/app/providers/app-state";
import { useActorParams } from "@/hooks/use-actor-params";
import { listHomeworkFor } from "@/rpc/homework";
import { listTeacherNoticesFor } from "@/rpc/notices";
import { listConversations, getOrCreateConversation, listMessages, sendMessage, markConversationRead } from "@/rpc/chat";
import { listSubmissionsFor, gradeSubmission } from "@/rpc/submissions";
import { DEMO_CLASS_STUDENTS, TEACHERS } from "@/data/mock/people";
import { CLASS_SECTIONS } from "@/data/mock/core";
import { EmptyState, ErrorState, LoadingCards } from "@/components/feedback/states";
import { FloatingAI } from "@/components/feedback/floating-ai";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { formatDateTime, formatDate } from "@/lib/format";
import { toast } from "sonner";
import { HomeworkFormDialog } from "@/components/shwai/homework-form-dialog";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/app/portal/teacher")({ component: TeacherPortalPage });

function TeacherPortalPage() {
  const { role, teacherId } = useAppState();
  const actorParams = useActorParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"dashboard" | "homework" | "students" | "staff-notices" | "chat">("dashboard");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  // Get active teacher info
  const teacher = useMemo(() => {
    return TEACHERS.find((t) => t.id === teacherId) || TEACHERS[0];
  }, [teacherId]);

  // Options for Create Homework
  const teacherClassOptions = useMemo(() => {
    return CLASS_SECTIONS.filter((c) => teacher.classes.includes(c.label)).map((c) => ({ id: c.id, label: c.label }));
  }, [teacher]);

  // Queries
  const homeworkQuery = useQuery({
    queryKey: ["homework", "teacher-portal", actorParams],
    queryFn: () => listHomeworkFor({ data: actorParams! }),
    enabled: Boolean(actorParams) && role === "teacher",
  });

  const staffNoticesQuery = useQuery({
    queryKey: ["notices", "staff-portal", actorParams],
    queryFn: () => listTeacherNoticesFor({ data: actorParams! }),
    enabled: Boolean(actorParams) && role === "teacher",
  });

  if (role !== "teacher") {
    return (
      <EmptyState
        title="Access Denied"
        description="The teacher portal is only accessible to accounts acting as a Teacher. Go to Settings or the top avatar menu to switch your role to Teacher."
        icon={<SquarePen className="size-6" />}
      />
    );
  }

  const hws = homeworkQuery.data ?? [];
  const staffNotices = staffNoticesQuery.data ?? [];

  // Get teacher's students
  const students = DEMO_CLASS_STUDENTS;

  return (
    <div className="relative space-y-6">
      {/* Teacher Profile Header */}
      <header className="surface-panel flex flex-col gap-4 p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary font-bold text-lg border border-primary/20">
            {teacher.name.split(" ").map((n) => n[0]).join("")}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight">{teacher.name}</h1>
              <Badge variant="outline" className="rounded-full bg-ai-soft text-ai border-ai/20 text-[10px]">
                {teacher.subjects[0]} Teacher
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Assigned classes: {teacher.classes.join(", ")} · Employee ID: {teacher.employeeId}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="rounded-xl border bg-muted/30 p-2.5 px-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Workload Index</p>
            <p className="text-lg font-black text-warning">{teacher.workloadIndex} / 10</p>
          </div>
          <div className="rounded-xl border bg-muted/30 p-2.5 px-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Attendance</p>
            <p className="text-lg font-black text-success">{teacher.attendancePct}%</p>
          </div>
          <div className="rounded-xl border bg-muted/30 p-2.5 px-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pending Grades</p>
            <p className="text-lg font-black text-danger">{teacher.gradingBacklog}</p>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        <TabsList className="flex flex-wrap rounded-xl bg-card p-1 shadow-sm border border-border/50">
          <TabsTrigger value="dashboard" className="text-xs gap-1.5"><Sparkles className="size-3.5" /> Dashboard</TabsTrigger>
          <TabsTrigger value="homework" className="text-xs gap-1.5"><BookOpen className="size-3.5" /> My Homework ({hws.length})</TabsTrigger>
          <TabsTrigger value="students" className="text-xs gap-1.5"><Users className="size-3.5" /> Students ({students.length})</TabsTrigger>
          <TabsTrigger value="staff-notices" className="text-xs gap-1.5"><Megaphone className="size-3.5" /> Principal Posts ({staffNotices.length})</TabsTrigger>
          <TabsTrigger value="chat" className="text-xs gap-1.5"><MessageSquare className="size-3.5" /> Chat</TabsTrigger>
        </TabsList>

        {/* Dashboard tab */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-1.5">
                  <SquarePen className="size-4 text-primary" /> Active Tasks & Classrooms
                </CardTitle>
                <CardDescription>Track active academic metrics and workload targets.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-xl bg-muted/30 p-3.5 border border-border/40 text-sm">
                  <div className="flex items-center gap-2.5">
                    <ClipboardCheck className="size-5 text-primary" />
                    <div>
                      <p className="font-semibold">Grading Backlog</p>
                      <p className="text-xs text-muted-foreground">Submissions awaiting review</p>
                    </div>
                  </div>
                  <p className="text-xl font-extrabold text-danger">{teacher.gradingBacklog} assignments</p>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-muted/30 p-3.5 border border-border/40 text-sm">
                  <div className="flex items-center gap-2.5">
                    <CalendarDays className="size-5 text-success" />
                    <div>
                      <p className="font-semibold">Weekly Periods</p>
                      <p className="text-xs text-muted-foreground">Scheduled teaching load</p>
                    </div>
                  </div>
                  <p className="text-xl font-extrabold text-success">{teacher.weeklyPeriods} / week</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-1.5">
                  <Megaphone className="size-4 text-warning" /> Latest Principal Posts
                </CardTitle>
                <CardDescription>Targeted notices published for teachers.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {staffNotices.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No staff notices published.</p>
                ) : (
                  staffNotices.slice(0, 3).map((n) => (
                    <div key={n.id} className="flex justify-between gap-3 text-sm border-b pb-2.5 last:border-0 last:pb-0">
                      <div>
                        <p className="font-semibold line-clamp-1">{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{n.body}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">{formatDate(n.createdAt)}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Homework Tab */}
        <TabsContent value="homework" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center pb-3">
              <div>
                <CardTitle className="text-lg font-bold">Created Homework Assignments</CardTitle>
                <CardDescription>Track student activity (views, submissions) and manage worksheets.</CardDescription>
              </div>
              <HomeworkFormDialog role="teacher" actorId={actorParams.actorId} classOptions={teacherClassOptions} />
            </CardHeader>
            <CardContent>
              {homeworkQuery.isLoading ? (
                <LoadingCards count={4} />
              ) : hws.length === 0 ? (
                <EmptyState title="No homework created yet" description="Assign your first homework to let students submit their work." icon={<BookOpen className="size-6" />} />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {hws.map((hw: any) => (
                    <div key={hw.id} className="border p-4 rounded-xl flex flex-col gap-3 hover:bg-muted/10 transition-colors bg-card relative">
                      <Link to="/app/homework/$homeworkId" params={{ homeworkId: hw.id }} className="absolute inset-0 z-0" aria-label={hw.title} />
                      <div className="relative z-10 flex justify-between items-start gap-2">
                        <Badge variant="outline" className="rounded-full text-[10px] bg-primary-soft text-primary border-primary/20">
                          {hw.subject}
                        </Badge>
                        <Badge variant="outline" className="rounded-full text-[10px]">
                          {hw.classLabel}
                        </Badge>
                      </div>
                      <div className="relative z-10">
                        <h3 className="font-bold text-base line-clamp-1">{hw.title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{hw.assignedCount ?? 0} students assigned</p>
                      </div>
                      <p className="relative z-10 text-xs text-muted-foreground line-clamp-2 leading-relaxed">{hw.description}</p>

                      <div className="relative z-10 flex flex-wrap gap-x-3 gap-y-1.5 pt-2 border-t border-border/30 text-[11px] text-muted-foreground mt-auto">
                        <span className="flex items-center gap-1">
                          <Eye className="size-3.5" /> {hw.viewedCount ?? 0} viewed
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="size-3.5" /> {hw.submittedCount ?? 0} submitted
                        </span>
                        {hw.lateCount > 0 && (
                          <span className="flex items-center gap-1 text-warning">
                            <Clock className="size-3.5" /> {hw.lateCount} late
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">Classroom Students Directory</CardTitle>
              <CardDescription>Track homework completion, attendance, and view student portfolios end-to-end.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {students.map((student) => (
                  <div key={student.id} className="border p-4 rounded-xl flex flex-col justify-between gap-3 bg-card hover:border-primary/50 transition-colors">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <div className="grid size-8 place-items-center rounded-lg bg-primary-soft text-primary font-bold text-xs">
                          {student.name.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <div>
                          <p className="font-bold text-sm">{student.name}</p>
                          <p className="text-[10px] text-muted-foreground">Grade {student.grade} - {student.section}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                        <div>
                          <p className="text-muted-foreground">Attendance</p>
                          <p className="font-bold text-success mt-0.5">{student.attendancePct}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">HW Completed</p>
                          <p className="font-bold text-primary mt-0.5">{student.homeworkCompletion}%</p>
                        </div>
                      </div>
                    </div>

                    <Sheet open={selectedStudent?.id === student.id} onOpenChange={(open) => !open && setSelectedStudent(null)}>
                      <SheetTrigger asChild>
                        <Button size="sm" variant="outline" className="w-full mt-3 h-8 text-[11px] gap-1" onClick={() => setSelectedStudent(student)}>
                          View academic profile <ChevronRight className="size-3" />
                        </Button>
                      </SheetTrigger>
                      <SheetContent className="max-w-lg overflow-y-auto sm:max-w-xl">
                        <SheetHeader className="pb-4 border-b">
                          <SheetTitle className="text-xl font-extrabold">{student.name}</SheetTitle>
                          <SheetDescription>Academic summary, homework submissions, and socratic chat portfolio.</SheetDescription>
                        </SheetHeader>
                        {selectedStudent?.id === student.id && (
                          <TeacherStudentProfileDetail student={student} actorParams={actorParams} />
                        )}
                      </SheetContent>
                    </Sheet>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Principal Posts Tab */}
        <TabsContent value="staff-notices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">Principal-to-Teacher Posts</CardTitle>
              <CardDescription>Directives, posts and official materials targeted exclusively to school staff.</CardDescription>
            </CardHeader>
            <CardContent>
              {staffNotices.length === 0 ? (
                <EmptyState title="No principal posts" description="There are no active staff announcements published currently." icon={<Megaphone className="size-6" />} />
              ) : (
                <div className="space-y-4">
                  {staffNotices.map((n: any) => (
                    <div key={n.id} className="p-4 border rounded-xl flex flex-col gap-2.5 bg-card hover:bg-muted/10 transition-colors">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-bold text-base text-primary">{n.title}</h3>
                        <Badge variant="outline" className="text-[10px]">
                          {formatDate(n.createdAt)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{n.body}</p>
                      {n.attachments && n.attachments.length > 0 && (
                        <div className="border-t pt-3 mt-1 space-y-1.5">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <Paperclip className="size-3" /> Staff attachments
                          </p>
                          <AttachmentList files={n.attachments} getUrl={async () => n.attachments[0].filePath} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Chat tab */}
        <TabsContent value="chat" className="space-y-4">
          <TeacherChatSection teacher={teacher} />
        </TabsContent>
      </Tabs>
      <FloatingAI />
    </div>
  );
}

function TeacherStudentProfileDetail({ student, actorParams }: { student: any; actorParams: any }) {
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveTab] = useState<"submissions" | "chat">("submissions");
  const [marksInput, setMarksInput] = useState("");
  const [feedbackInput, setFeedbackInput] = useState("");
  const [activeGradingSub, setActiveGradingSub] = useState<any>(null);

  // Load submissions for this student
  const submissionsQuery = useQuery({
    queryKey: ["submissions", "student-profile", actorParams, student.id],
    queryFn: () => listSubmissionsFor({ data: { ...actorParams!, studentId: student.id } }),
    enabled: Boolean(actorParams),
  });

  // Grade submission mutation
  const gradeMutation = useMutation({
    mutationFn: (data: { submissionId: string; marks?: number; feedback?: string }) =>
      gradeSubmission({ data: { ...actorParams!, ...data } }),
    onSuccess: () => {
      toast.success("Submission successfully graded");
      queryClient.invalidateQueries({ queryKey: ["submissions"] });
      setActiveGradingSub(null);
      setMarksInput("");
      setFeedbackInput("");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to save grading"),
  });

  const subs = submissionsQuery.data ?? [];

  return (
    <div className="space-y-6 pt-4">
      {/* Short quick metrics */}
      <div className="grid grid-cols-2 gap-4 text-xs border rounded-xl p-3 bg-muted/20">
        <div>
          <p className="text-muted-foreground uppercase font-bold tracking-wider text-[10px]">Overall Grade Average</p>
          <p className="text-xl font-extrabold text-primary mt-0.5">{student.avgScore}%</p>
        </div>
        <div className="border-l pl-4">
          <p className="text-muted-foreground uppercase font-bold tracking-wider text-[10px]">Assigned Submissions</p>
          <p className="text-xl font-extrabold text-info mt-0.5">{subs.length} submitted</p>
        </div>
      </div>

      <Tabs value={activeSubTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        <TabsList className="grid grid-cols-2 bg-muted p-1 rounded-lg">
          <TabsTrigger value="submissions" className="text-xs">Homework Submissions</TabsTrigger>
          <TabsTrigger value="chat" className="text-xs">Direct Chat</TabsTrigger>
        </TabsList>

        <TabsContent value="submissions">
          {submissionsQuery.isLoading ? (
            <div className="py-10 text-center"><Loader2 className="size-4 animate-spin mx-auto text-primary" /></div>
          ) : subs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No submissions found for this student.</p>
          ) : (
            <div className="space-y-4">
              {subs.map((sub) => {
                const isGraded = sub.status === "graded";
                const isLate = sub.status === "late";
                return (
                  <div key={sub.id} className="border p-4 rounded-xl space-y-3 bg-card flex flex-col gap-1">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <p className="font-bold text-sm text-primary">Homework ID: {sub.homeworkId.slice(0,8)}</p>
                        <p className="text-[11px] text-muted-foreground">Submitted on {formatDateTime(sub.submittedAt)}</p>
                      </div>
                      <Badge variant="outline" className={cn("rounded-full text-[10px]", isGraded ? "border-success/30 bg-success-soft text-success" : isLate ? "border-warning/30 bg-warning-soft text-warning" : "border-border text-muted-foreground")}>
                        {isGraded ? "Graded" : isLate ? "Submitted late" : "Submitted"}
                      </Badge>
                    </div>

                    {sub.comment && (
                      <p className="text-xs text-muted-foreground italic bg-muted/40 p-2.5 rounded-lg border">
                        &ldquo;{sub.comment}&rdquo;
                      </p>
                    )}

                    {sub.files && sub.files.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                          <Paperclip className="size-3" /> Submitted Documents
                        </p>
                        <AttachmentList files={sub.files} getUrl={async () => sub.files[0].filePath} />
                      </div>
                    )}

                    {isGraded ? (
                      <div className="p-3 bg-success-soft/20 border border-success/20 rounded-lg text-xs space-y-1 mt-2">
                        <p className="font-bold text-success flex items-center gap-1"><Award className="size-3.5" /> Marks: {sub.marks ?? "—"}</p>
                        {sub.feedback && <p className="text-muted-foreground mt-0.5">{sub.feedback}</p>}
                      </div>
                    ) : (
                      <>
                        {activeGradingSub?.id === sub.id ? (
                          <form
                            className="space-y-3 border-t pt-3 mt-2"
                            onSubmit={(e) => {
                              e.preventDefault();
                              gradeMutation.mutate({
                                submissionId: sub.id,
                                marks: marksInput ? Number(marksInput) : undefined,
                                feedback: feedbackInput.trim() || undefined,
                              });
                            }}
                          >
                            <div className="grid gap-3 sm:grid-cols-3">
                              <div className="space-y-1">
                                <Label htmlFor="grade-marks-input" className="text-xs font-bold">Marks</Label>
                                <Input
                                  id="grade-marks-input"
                                  type="number"
                                  placeholder="e.g. 15"
                                  value={marksInput}
                                  onChange={(e) => setMarksInput(e.target.value)}
                                  className="h-8 text-xs"
                                  required
                                />
                              </div>
                              <div className="sm:col-span-2 space-y-1">
                                <Label htmlFor="grade-feedback-input" className="text-xs font-bold">Feedback</Label>
                                <Input
                                  id="grade-feedback-input"
                                  placeholder="e.g. Excellent work on calculations!"
                                  value={feedbackInput}
                                  onChange={(e) => setFeedbackInput(e.target.value)}
                                  className="h-8 text-xs"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setActiveGradingSub(null)}>Cancel</Button>
                              <Button size="sm" type="submit" className="h-8 text-xs" disabled={gradeMutation.isPending}>
                                {gradeMutation.isPending && <Loader2 className="size-3 animate-spin mr-1" />} Save grading
                              </Button>
                            </div>
                          </form>
                        ) : (
                          <Button size="sm" className="w-full mt-2 h-8 text-[11px] gap-1" onClick={() => {
                            setActiveGradingSub(sub);
                            setMarksInput(sub.marks?.toString() ?? "");
                            setFeedbackInput(sub.feedback ?? "");
                          }}>
                            Grade Submission <Award className="size-3.5" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="chat">
          <TeacherStudentDirectChat student={student} actorParams={actorParams} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TeacherStudentDirectChat({ student, actorParams }: { student: any; actorParams: any }) {
  const queryClient = useQueryClient();
  const [chatInput, setChatInput] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);

  // Auto load or create conversation when chat tab is opened
  const convoQuery = useQuery({
    queryKey: ["conversation-teacher-student", actorParams, student.id],
    queryFn: () => getOrCreateConversation({ data: { ...actorParams!, otherId: student.id } }),
    enabled: Boolean(actorParams),
  });

  const activeConvoId = convoQuery.data?.id;

  const messagesQuery = useQuery({
    queryKey: ["chat-messages-teacher", actorParams, activeConvoId],
    queryFn: () => listMessages({ data: { ...actorParams!, conversationId: activeConvoId! } }),
    enabled: Boolean(actorParams) && Boolean(activeConvoId),
  });

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.set("role", "teacher");
      if (actorParams?.actorId) formData.set("actorId", actorParams.actorId);
      formData.set("conversationId", activeConvoId!);
      formData.set("body", chatInput.trim());
      if (attachment) formData.set("attachment", attachment);
      return sendMessage({ data: formData });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-messages-teacher"] });
      setChatInput("");
      setAttachment(null);
    },
    onError: (err: Error) => toast.error(err.message || "Failed to send message"),
  });

  const messages = messagesQuery.data ?? [];

  if (convoQuery.isLoading) {
    return <div className="text-center py-10"><Loader2 className="size-4 animate-spin mx-auto text-primary" /></div>;
  }

  return (
    <div className="border rounded-xl p-3 flex flex-col justify-between h-[360px] bg-card mt-2">
      {activeConvoId ? (
        <>
          <ScrollArea className="flex-1 pr-2 space-y-3 mb-3">
            {messagesQuery.isLoading ? (
              <div className="text-center py-10"><Loader2 className="size-4 animate-spin mx-auto" /></div>
            ) : messages.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-10">Send your first message to start the conversation.</p>
            ) : (
              <div className="space-y-3">
                {messages.map((m) => {
                  const isMine = m.senderType === "teacher";
                  return (
                    <div key={m.id} className={cn("flex flex-col max-w-[75%] gap-1", isMine ? "ml-auto items-end" : "mr-auto items-start")}>
                      <div
                        className={cn(
                          "p-3 rounded-2xl text-xs leading-relaxed",
                          isMine ? "bg-primary text-white rounded-tr-none" : "bg-muted text-foreground rounded-tl-none"
                        )}
                      >
                        <p>{m.body}</p>
                        {m.attachment && (
                          <div className="mt-2 border-t border-white/20 pt-1.5 flex items-center gap-1.5 text-[10px]">
                            <Paperclip className="size-3" />
                            <a href={m.attachment.filePath} target="_blank" rel="noreferrer" className="underline truncate hover:text-white/80">
                              {m.attachment.fileName}
                            </a>
                          </div>
                        )}
                      </div>
                      <span className="text-[9px] text-muted-foreground">{formatDateTime(m.createdAt)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          <form
            className="space-y-2 border-t pt-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!chatInput.trim() && !attachment) return;
              sendMessageMutation.mutate();
            }}
          >
            <div className="flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type your message…"
                className="h-9 text-xs"
              />
              <Label htmlFor="teacher-chat-attachment" className="cursor-pointer border rounded-md px-2 flex items-center hover:bg-muted shrink-0 h-9">
                <Paperclip className="size-4 text-muted-foreground" />
                <input
                  id="teacher-chat-attachment"
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setAttachment(file);
                    if (file) toast.success(`Attached ${file.name}`);
                  }}
                />
              </Label>
              <Button size="sm" type="submit" disabled={sendMessageMutation.isPending || (!chatInput.trim() && !attachment)} className="h-9">
                {sendMessageMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </Button>
            </div>
            {attachment && (
              <p className="text-[10px] text-primary font-medium flex items-center gap-1">
                Selected attachment: {attachment.name}
              </p>
            )}
          </form>
        </>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-10">Unable to load direct chat.</p>
      )}
    </div>
  );
}

function TeacherChatSection({ teacher }: { teacher: any }) {
  const actorParams = useActorParams();
  const queryClient = useQueryClient();
  const [selectedConvoId, setSelectedConvoId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [convoStudentId, setConvoStudentId] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);

  // Load conversations
  const listConversationsQuery = useQuery({
    queryKey: ["conversations-teacher", actorParams],
    queryFn: () => listConversations({ data: actorParams! }),
    enabled: Boolean(actorParams),
  });

  // Load active messages
  const listMessagesQuery = useQuery({
    queryKey: ["chat-messages-teacher-tab", actorParams, selectedConvoId],
    queryFn: () => listMessages({ data: { ...actorParams!, conversationId: selectedConvoId! } }),
    enabled: Boolean(actorParams) && Boolean(selectedConvoId),
  });

  // Open conversation mutation
  const openConvoMutation = useMutation({
    mutationFn: (otherId: string) => getOrCreateConversation({ data: { ...actorParams!, otherId } }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["conversations-teacher"] });
      setSelectedConvoId(res.id);
    },
    onError: (err: Error) => toast.error(err.message || "Could not open conversation"),
  });

  // Send message mutation
  const sendMsgMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.set("role", "teacher");
      if (actorParams?.actorId) formData.set("actorId", actorParams.actorId);
      formData.set("conversationId", selectedConvoId!);
      formData.set("body", chatInput.trim());
      if (attachment) formData.set("attachment", attachment);
      return sendMessage({ data: formData });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-messages-teacher-tab", actorParams, selectedConvoId] });
      queryClient.invalidateQueries({ queryKey: ["conversations-teacher"] });
      setChatInput("");
      setAttachment(null);
    },
    onError: (err: Error) => toast.error(err.message || "Failed to send message"),
  });

  const convos = listConversationsQuery.data ?? [];
  const messages = listMessagesQuery.data ?? [];

  return (
    <Card className="min-h-[450px]">
      <CardHeader>
        <CardTitle className="text-lg font-bold flex items-center gap-1.5">
          <MessageSquare className="size-5 text-primary" /> Teacher-Student Chat
        </CardTitle>
        <CardDescription>Direct authenticated communication with your students.</CardDescription>
      </CardHeader>
      <CardContent className="grid md:grid-cols-3 gap-4">
        {/* Sidebar: conversations list */}
        <div className="md:col-span-1 border rounded-xl p-3 bg-muted/10 space-y-3">
          <Label className="font-bold text-xs uppercase text-muted-foreground tracking-wide">Open Chat with</Label>
          <div className="flex gap-2">
            <select
              value={convoStudentId}
              onChange={(e) => setConvoStudentId(e.target.value)}
              className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-xs"
            >
              <option value="">Select student...</option>
              {DEMO_CLASS_STUDENTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (Grade {s.grade} {s.section})
                </option>
              ))}
            </select>
            <Button
              size="sm"
              className="h-9"
              disabled={!convoStudentId || openConvoMutation.isPending}
              onClick={() => openConvoMutation.mutate(convoStudentId)}
            >
              {openConvoMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            </Button>
          </div>

          <Separator className="my-2" />

          <ScrollArea className="h-64 space-y-2">
            {listConversationsQuery.isLoading ? (
              <div className="text-center py-4"><Loader2 className="size-4 animate-spin mx-auto text-primary" /></div>
            ) : convos.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No active chats.</p>
            ) : (
              convos.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedConvoId(c.id);
                    markConversationRead({ data: { ...actorParams!, conversationId: c.id } }).catch(() => {});
                  }}
                  className={cn(
                    "w-full text-left p-3 rounded-lg flex items-center justify-between text-xs transition-colors border border-transparent",
                    selectedConvoId === c.id ? "bg-primary-soft text-primary border-primary/20" : "hover:bg-muted/40"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-bold truncate">{c.otherName}</p>
                    <p className="text-muted-foreground truncate mt-0.5">{c.lastMessageBody || "No messages yet."}</p>
                  </div>
                  {c.unreadCount > 0 && (
                    <Badge className="bg-danger text-white rounded-full size-4 flex items-center justify-center text-[9px] p-0 shrink-0">
                      {c.unreadCount}
                    </Badge>
                  )}
                </button>
              ))
            )}
          </ScrollArea>
        </div>

        {/* Messaging Box */}
        <div className="md:col-span-2 border rounded-xl p-3 flex flex-col justify-between h-[360px] bg-card">
          {selectedConvoId ? (
            <>
              {/* Message History */}
              <ScrollArea className="flex-1 pr-2 space-y-3 mb-3">
                {listMessagesQuery.isLoading ? (
                  <div className="text-center py-10"><Loader2 className="size-4 animate-spin mx-auto" /></div>
                ) : messages.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-10">Send your first message to start the conversation.</p>
                ) : (
                  <div className="space-y-3">
                    {messages.map((m) => {
                      const isMine = m.senderType === "teacher";
                      return (
                        <div key={m.id} className={cn("flex flex-col max-w-[75%] gap-1", isMine ? "ml-auto items-end" : "mr-auto items-start")}>
                          <div
                            className={cn(
                              "p-3 rounded-2xl text-xs leading-relaxed",
                              isMine ? "bg-primary text-white rounded-tr-none" : "bg-muted text-foreground rounded-tl-none"
                            )}
                          >
                            <p>{m.body}</p>
                            {m.attachment && (
                              <div className="mt-2 border-t border-white/20 pt-1.5 flex items-center gap-1.5 text-[10px]">
                                <Paperclip className="size-3" />
                                <a href={m.attachment.filePath} target="_blank" rel="noreferrer" className="underline truncate hover:text-white/80">
                                  {m.attachment.fileName}
                                </a>
                              </div>
                            )}
                          </div>
                          <span className="text-[9px] text-muted-foreground">{formatDateTime(m.createdAt)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>

              {/* Message inputs */}
              <form
                className="space-y-2 border-t pt-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!chatInput.trim() && !attachment) return;
                  sendMsgMutation.mutate();
                }}
              >
                <div className="flex gap-2">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type your message…"
                    className="h-9 text-xs"
                  />
                  <Label htmlFor="teacher-tab-chat-attachment" className="cursor-pointer border rounded-md px-2 flex items-center hover:bg-muted shrink-0 h-9">
                    <Paperclip className="size-4 text-muted-foreground" />
                    <input
                      id="teacher-tab-chat-attachment"
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        setAttachment(file);
                        if (file) toast.success(`Attached ${file.name}`);
                      }}
                    />
                  </Label>
                  <Button size="sm" type="submit" disabled={sendMsgMutation.isPending || (!chatInput.trim() && !attachment)} className="h-9">
                    {sendMsgMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  </Button>
                </div>
                {attachment && (
                  <p className="text-[10px] text-primary font-medium flex items-center gap-1">
                    Selected attachment: {attachment.name}
                  </p>
                )}
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
              <MessageSquare className="size-8 text-muted-foreground opacity-40 mb-2" />
              <p className="text-sm font-bold text-muted-foreground">No active conversation</p>
              <p className="text-xs text-muted-foreground mt-0.5">Select or open a chat with a student to begin.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
