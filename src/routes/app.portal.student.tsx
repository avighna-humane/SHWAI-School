import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  MessageSquare,
  Sparkles,
  Trophy,
  UserCheck,
  Megaphone,
  User,
  GraduationCap,
  ClipboardCheck,
  Send,
  Loader2,
  AlertTriangle,
  Paperclip
} from "lucide-react";
import { useAppState } from "@/app/providers/app-state";
import { useActorParams } from "@/hooks/use-actor-params";
import { listHomeworkFor } from "@/rpc/homework";
import { listNoticesFor } from "@/rpc/notices";
import { listConversations, getOrCreateConversation, listMessages, sendMessage, markConversationRead } from "@/rpc/chat";
import { DEMO_CLASS_STUDENTS } from "@/data/mock/people";
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
import { formatDateTime, formatDate } from "@/lib/format";
import { toast } from "sonner";
import { SubmitHomeworkForm } from "@/components/shwai/submit-homework-form";
import { AttachmentList } from "@/components/shwai/attachment-list";

export const Route = createFileRoute("/app/portal/student")({ component: StudentPortalPage });

function statusMeta(hw: any) {
  if (hw.viewerSubmission?.status === "graded") return { label: `Graded · ${hw.viewerSubmission.marks ?? "—"}${hw.totalMarks ? `/${hw.totalMarks}` : ""}`, tone: "success" as const };
  if (hw.viewerSubmission?.status === "late") return { label: "Submitted late", tone: "warning" as const };
  if (hw.viewerSubmission?.status === "submitted") return { label: "Submitted", tone: "success" as const };
  const overdue = new Date(hw.dueAt).getTime() < Date.now();
  if (overdue) return { label: "Overdue", tone: "danger" as const };
  return { label: "Pending", tone: "muted" as const };
}

const TONE_CLASSES: Record<string, string> = {
  success: "border-success/30 bg-success-soft text-success",
  warning: "border-warning/30 bg-warning-soft text-warning",
  danger: "border-danger/30 bg-danger-soft text-danger",
  muted: "border-border text-muted-foreground",
};

function StudentPortalPage() {
  const { role, studentId } = useAppState();
  const actorParams = useActorParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"overview" | "notices" | "homework" | "grades" | "attendance" | "chat">("overview");

  // Get current active student info
  const student = useMemo(() => {
    return DEMO_CLASS_STUDENTS.find((s) => s.id === studentId) || DEMO_CLASS_STUDENTS[0];
  }, [studentId]);

  // Queries
  const homeworkQuery = useQuery({
    queryKey: ["homework", "student-portal", actorParams],
    queryFn: () => listHomeworkFor({ data: actorParams! }),
    enabled: Boolean(actorParams) && role === "student",
  });

  const noticesQuery = useQuery({
    queryKey: ["notices", "student-portal", actorParams],
    queryFn: () => listNoticesFor({ data: actorParams! }),
    enabled: Boolean(actorParams) && role === "student",
  });

  if (role !== "student") {
    return (
      <EmptyState
        title="Access Denied"
        description="The student portal is only accessible to accounts acting as a Student. Go to Settings or the top avatar menu to switch your role to Student."
        icon={<GraduationCap className="size-6" />}
      />
    );
  }

  const items = homeworkQuery.data ?? [];
  const notices = noticesQuery.data ?? [];

  // Summary counts
  const pendingCount = items.filter((h) => !h.viewerSubmission).length;
  const submittedCount = items.filter((h) => h.viewerSubmission).length;

  return (
    <div className="relative space-y-6">
      {/* Student Profile Header */}
      <header className="surface-panel flex flex-col gap-4 p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary font-bold text-lg border border-primary/20">
            {student.name.split(" ").map((n) => n[0]).join("")}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight">{student.name}</h1>
              <Badge variant="outline" className="rounded-full bg-ai-soft text-ai border-ai/20 text-[10px]">
                Level {student.level} Student
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Grade {student.grade} - {student.section} · Roll No: {student.admissionNo}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="rounded-xl border bg-muted/30 p-2.5 px-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Attendance</p>
            <p className="text-lg font-black text-success">{student.attendancePct}%</p>
          </div>
          <div className="rounded-xl border bg-muted/30 p-2.5 px-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">XP Earned</p>
            <p className="text-lg font-black text-primary flex items-center gap-1 justify-center">
              <Trophy className="size-4 text-warning fill-warning" /> {student.xp}
            </p>
          </div>
          <div className="rounded-xl border bg-muted/30 p-2.5 px-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">HW Completed</p>
            <p className="text-lg font-black text-info">{student.homeworkCompletion}%</p>
          </div>
        </div>
      </header>

      {/* Tabs Layout */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        <TabsList className="flex flex-wrap rounded-xl bg-card p-1 shadow-sm border border-border/50">
          <TabsTrigger value="overview" className="text-xs gap-1.5"><Sparkles className="size-3.5" /> Overview</TabsTrigger>
          <TabsTrigger value="notices" className="text-xs gap-1.5"><Megaphone className="size-3.5" /> Notices ({notices.length})</TabsTrigger>
          <TabsTrigger value="homework" className="text-xs gap-1.5"><BookOpen className="size-3.5" /> Homework ({pendingCount} pending)</TabsTrigger>
          <TabsTrigger value="grades" className="text-xs gap-1.5"><ClipboardCheck className="size-3.5" /> Grades & Reports</TabsTrigger>
          <TabsTrigger value="attendance" className="text-xs gap-1.5"><UserCheck className="size-3.5" /> Attendance</TabsTrigger>
          <TabsTrigger value="chat" className="text-xs gap-1.5"><MessageSquare className="size-3.5" /> Chat</TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Quick Stats Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-1.5">
                  <Trophy className="size-4 text-warning" /> Performance & Streaks
                </CardTitle>
                <CardDescription>Your current learning achievements.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-xl bg-muted/30 p-3.5 border border-border/40">
                  <div className="flex items-center gap-2.5">
                    <Clock className="size-5 text-warning" />
                    <div>
                      <p className="text-sm font-semibold">Daily Streak</p>
                      <p className="text-xs text-muted-foreground">Keep studying to increase it!</p>
                    </div>
                  </div>
                  <p className="text-xl font-extrabold text-warning">{student.streak} Days</p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-muted-foreground">Level Progression</span>
                    <span>{student.xp % 1000} / 1000 XP</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${(student.xp % 1000) / 10}%` }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions / Notifications */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-1.5">
                  <Megaphone className="size-4 text-primary" /> Recent Notices
                </CardTitle>
                <CardDescription>Most recent announcements from school and teachers.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {notices.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No recent notices.</p>
                ) : (
                  notices.slice(0, 3).map((n: any) => (
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

        {/* Tab 2: Notices */}
        <TabsContent value="notices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">Announcements & Notices</CardTitle>
              <CardDescription>All targeted notices for your class and section.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="sm" className="mb-4">
                <Link to="/app/announcements">Open Notice Center</Link>
              </Button>
              {notices.length === 0 ? (
                <EmptyState title="No notices" description="There are no notices published for you." icon={<Megaphone className="size-6" />} />
              ) : (
                <div className="space-y-3.5">
                  {notices.map((n: any) => (
                    <div key={n.id} className="p-4 border rounded-xl flex items-start justify-between gap-4 bg-card hover:bg-muted/10 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-base text-primary">{n.title}</p>
                          {!n.viewerHasViewed && (
                            <Badge className="bg-danger-soft text-danger border-danger/20 text-[9px] rounded-full">New</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{n.body}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">Published by {n.authorName} on {formatDateTime(n.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Homework */}
        <TabsContent value="homework" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">Your Homework Assignments</CardTitle>
              <CardDescription>Assigned homework with dynamic submission history and late checking.</CardDescription>
            </CardHeader>
            <CardContent>
              {homeworkQuery.isLoading ? (
                <LoadingCards count={4} />
              ) : homeworkQuery.isError ? (
                <ErrorState message={(homeworkQuery.error as Error)?.message} onRetry={() => homeworkQuery.refetch()} />
              ) : items.length === 0 ? (
                <EmptyState title="No homework assigned" description="Your teachers haven't assigned any homework yet." icon={<BookOpen className="size-6" />} />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {items.map((hw: any) => {
                    const status = statusMeta(hw);
                    return (
                      <div key={hw.id} className="border p-4 rounded-xl flex flex-col gap-3 hover:bg-muted/10 transition-colors bg-card relative">
                        <Link to="/app/homework/$homeworkId" params={{ homeworkId: hw.id }} className="absolute inset-0 z-0" aria-label={hw.title} />
                        <div className="relative z-10 flex justify-between items-start gap-2">
                          <Badge variant="outline" className="rounded-full text-[10px] bg-primary-soft text-primary border-primary/20">
                            {hw.subject}
                          </Badge>
                          <Badge variant="outline" className={cn("rounded-full text-[10px]", TONE_CLASSES[status.tone])}>
                            {status.label}
                          </Badge>
                        </div>
                        <div className="relative z-10">
                          <h3 className="font-bold text-base line-clamp-1">{hw.title}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">Assigned by {hw.teacherName}</p>
                        </div>
                        <p className="relative z-10 text-xs text-muted-foreground line-clamp-2 leading-relaxed">{hw.description}</p>
                        <div className="relative z-10 mt-auto flex items-center gap-1.5 text-xs text-muted-foreground pt-2 border-t border-border/30">
                          <Clock className="size-3.5 text-muted-foreground" /> Due {formatDate(hw.dueAt)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Grades */}
        <TabsContent value="grades" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">Academic Grades & Student Reports</CardTitle>
              <CardDescription>Academic evaluations and verified grading summaries.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border p-4 bg-success-soft/20 border-success/20 flex flex-col gap-1">
                  <p className="text-xs font-semibold text-success uppercase tracking-wider">Average Score</p>
                  <p className="text-3xl font-extrabold">{student.avgScore}%</p>
                </div>
                <div className="rounded-xl border p-4 bg-info-soft/20 border-info/20 flex flex-col gap-1">
                  <p className="text-xs font-semibold text-info uppercase tracking-wider">Homework Completion</p>
                  <p className="text-3xl font-extrabold">{student.homeworkCompletion}%</p>
                </div>
              </div>

              {/* Mock Grade Cards */}
              <div className="border rounded-xl divide-y bg-card">
                {[
                  { subject: "Mathematics", marks: "18 / 20", grade: "A+", status: "Graded" },
                  { subject: "Science", marks: "17 / 20", grade: "A", status: "Graded" },
                  { subject: "English Literature", marks: "19 / 20", grade: "A+", status: "Graded" },
                  { subject: "History", marks: "15 / 20", grade: "B", status: "Graded" }
                ].map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3.5 px-4">
                    <div>
                      <p className="font-bold text-sm">{item.subject}</p>
                      <p className="text-xs text-muted-foreground">Classroom Test 1</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-bold">{item.marks}</p>
                        <p className="text-[10px] text-muted-foreground">{item.status}</p>
                      </div>
                      <Badge className="font-extrabold rounded-lg bg-primary-soft text-primary border-primary/20 text-xs px-2.5 h-7">
                        {item.grade}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: Attendance */}
        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">Attendance Register</CardTitle>
              <CardDescription>Daily attendance trends and records.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl border flex items-center justify-between bg-muted/20">
                <div>
                  <p className="text-sm font-bold">Current Attendance</p>
                  <p className="text-xs text-muted-foreground">Maintain above 75% for exam eligibility.</p>
                </div>
                <p className="text-3xl font-black text-success">{student.attendancePct}%</p>
              </div>

              {/* Mock Calendar Grid */}
              <div className="grid grid-cols-7 gap-2 border p-4 rounded-xl bg-card">
                {Array.from({ length: 14 }).map((_, i) => (
                  <div key={i} className="aspect-square border rounded-lg flex flex-col items-center justify-center bg-success-soft/30 border-success/30 relative">
                    <span className="text-[10px] font-bold text-success-foreground">{i + 1}</span>
                    <Badge className="bg-success text-white text-[8px] h-3 px-1 rounded-full border-0 absolute bottom-1">P</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 6: Chat */}
        <TabsContent value="chat" className="space-y-4">
          <StudentChatSection student={student} />
        </TabsContent>
      </Tabs>
      <FloatingAI />
    </div>
  );
}

function StudentChatSection({ student }: { student: any }) {
  const actorParams = useActorParams();
  const queryClient = useQueryClient();
  const [selectedConvoId, setSelectedConvoId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [convoTeacherId, setConvoTeacherId] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);

  // Load conversations
  const listConversationsQuery = useQuery({
    queryKey: ["conversations", actorParams],
    queryFn: () => listConversations({ data: actorParams! }),
    enabled: Boolean(actorParams),
  });

  // Load active messages
  const listMessagesQuery = useQuery({
    queryKey: ["chat-messages", actorParams, selectedConvoId],
    queryFn: () => listMessages({ data: { ...actorParams!, conversationId: selectedConvoId! } }),
    enabled: Boolean(actorParams) && Boolean(selectedConvoId),
  });

  // Open conversation mutation
  const openConvoMutation = useMutation({
    mutationFn: (otherId: string) => getOrCreateConversation({ data: { ...actorParams!, otherId } }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setSelectedConvoId(res.id);
    },
    onError: (err: Error) => toast.error(err.message || "Could not open conversation"),
  });

  // Send message mutation
  const sendMsgMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.set("role", "student");
      if (actorParams?.actorId) formData.set("actorId", actorParams.actorId);
      formData.set("conversationId", selectedConvoId!);
      formData.set("body", chatInput.trim());
      if (attachment) formData.set("attachment", attachment);
      return sendMessage({ data: formData });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-messages", actorParams, selectedConvoId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
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
        <CardDescription>Direct authenticated communication with your class teachers.</CardDescription>
      </CardHeader>
      <CardContent className="grid md:grid-cols-3 gap-4">
        {/* Sidebar: conversations list */}
        <div className="md:col-span-1 border rounded-xl p-3 bg-muted/10 space-y-3">
          <Label className="font-bold text-xs uppercase text-muted-foreground tracking-wide">Open Chat with</Label>
          <div className="flex gap-2">
            <select
              value={convoTeacherId}
              onChange={(e) => setConvoTeacherId(e.target.value)}
              className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-xs"
            >
              <option value="">Select teacher...</option>
              {TEACHERS.filter((t) => t.classes.includes(`Grade ${student.grade} — ${student.section}`)).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.subjects[0]})
                </option>
              ))}
            </select>
            <Button
              size="sm"
              className="h-9"
              disabled={!convoTeacherId || openConvoMutation.isPending}
              onClick={() => openConvoMutation.mutate(convoTeacherId)}
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
                      const isMine = m.senderType === "student";
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
                  <Label htmlFor="chat-attachment" className="cursor-pointer border rounded-md px-2 flex items-center hover:bg-muted shrink-0 h-9">
                    <Paperclip className="size-4 text-muted-foreground" />
                    <input
                      id="chat-attachment"
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
              <p className="text-xs text-muted-foreground mt-0.5">Select or open a chat with a teacher to begin.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
