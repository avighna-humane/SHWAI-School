import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { useAppState } from "@/app/providers/app-state";
import { getDemoIds, CHAT_CONTACTS } from "@/lib/demo-ids";
import { STUDENTS } from "@/data/mock/people";
import { CLASS_SECTIONS } from "@/data/mock/core";
import { listStudentSubmissions, type SubmissionWithHomework } from "@/actions/homework";
import { getMessages, sendMessage } from "@/actions/chat";
import { PermissionDenied } from "@/components/feedback/states";
import { ROLE_LABEL } from "@/config/roles";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export const Route = createFileRoute("/app/students/$studentId")({ component: StudentProfilePage });

const CLS_MAP = Object.fromEntries(CLASS_SECTIONS.map((c) => [c.id, c]));

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    submitted: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    late: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    graded: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    pending: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${map[status] ?? map.pending}`}
    >
      {status}
    </span>
  );
}

function hsl(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${h},60%,55%)`;
}
function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function StudentProfilePage() {
  const { studentId } = Route.useParams();
  const { role, schoolId } = useAppState();
  const navigate = useNavigate();
  const { userId, userName } = getDemoIds(role);

  if (!["teacher", "principal", "admin", "owner"].includes(role)) {
    return <PermissionDenied role={ROLE_LABEL[role]} />;
  }

  const student = STUDENTS.find((s) => s.id === studentId);
  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <Icons.UserX className="size-10 text-muted-foreground/40" />
        <p className="font-semibold">Student not found</p>
        <Button variant="outline" onClick={() => navigate({ to: "/app/students" })}>
          Back to Students
        </Button>
      </div>
    );
  }

  const cls = CLS_MAP[student.classId ?? ""];

  return (
    <div className="space-y-6">
      {/* Back nav */}
      <button
        onClick={() => navigate({ to: "/app/students" })}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Icons.ChevronLeft className="size-4" />
        Back to Students
      </button>

      {/* Profile header */}
      <div className="flex items-start gap-4 rounded-xl border p-5">
        <Avatar className="size-16">
          <AvatarFallback
            style={{ backgroundColor: hsl(student.name), color: "#fff" }}
            className="text-xl font-bold"
          >
            {initials(student.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold">{student.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Icons.GraduationCap className="size-3.5" />
              {cls?.label ?? student.classId}
            </span>
            <span className="flex items-center gap-1">
              <Icons.Hash className="size-3.5" />
              {student.id}
            </span>
            <span className="flex items-center gap-1">
              <Icons.Users className="size-3.5" />
              {student.guardianName}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className={`text-xs ${(student.attendancePct ?? 0) < 75 ? "border-orange-500 text-orange-500" : "border-green-600 text-green-600"}`}
            >
              <Icons.UserCheck className="mr-1 size-3" />
              {student.attendancePct ?? "—"}% attendance
            </Badge>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="submissions">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab student={student} cls={cls} />
        </TabsContent>
        <TabsContent value="submissions" className="mt-4">
          <SubmissionsTab studentId={studentId} schoolId={schoolId} />
        </TabsContent>
        <TabsContent value="chat" className="mt-4">
          <ChatTab
            schoolId={schoolId}
            role={role}
            myId={userId}
            myName={userName}
            partnerId={studentId}
            partnerName={student.name}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

type StudentOverview = {
  id: string;
  classId?: string;
  attendancePct: number;
  avgScore: number;
  guardianName: string;
  guardianPhone: string;
};

type ClassOverview = {
  label?: string;
  grade?: string | number;
  section?: string;
};

function OverviewTab({ student, cls }: { student: StudentOverview; cls: ClassOverview | null }) {
  const rows = [
    { label: "Student ID", value: student.id },
    { label: "Class", value: cls?.label ?? student.classId ?? "—" },
    { label: "Grade", value: cls?.grade ?? "—" },
    { label: "Section", value: cls?.section ?? "—" },
    { label: "Attendance", value: `${student.attendancePct}%` },
    { label: "Avg Score", value: `${student.avgScore}%` },
    { label: "Guardian", value: student.guardianName },
    { label: "Guardian Phone", value: student.guardianPhone },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-xl border p-5">
        <h3 className="mb-4 font-semibold">Student Details</h3>
        <dl className="space-y-3">
          {rows.map((r) => (
            <div key={r.label} className="flex items-start justify-between gap-4">
              <dt className="text-sm text-muted-foreground">{r.label}</dt>
              <dd className="text-sm font-medium text-right">{String(r.value)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

function SubmissionsTab({ studentId, schoolId }: { studentId: string; schoolId: string }) {
  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ["student-submissions", studentId, schoolId],
    queryFn: () => listStudentSubmissions({ data: {} }),
  });

  if (isLoading)
    return (
      <div className="flex h-32 items-center justify-center text-muted-foreground">
        <Icons.Loader2 className="mr-2 size-4 animate-spin" />
        Loading…
      </div>
    );
  if (submissions.length === 0)
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
        <Icons.FileX className="size-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No submissions from this student yet.</p>
      </div>
    );

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            {["Homework", "Subject", "Submitted", "Status", "Grade", "Feedback", ""].map((h) => (
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
          {submissions.map((s) => (
            <tr key={s.id} className="border-b transition-colors last:border-0 hover:bg-muted/30">
              <td className="px-4 py-3 font-medium max-w-[160px] truncate">{s.homework_title}</td>
              <td className="px-4 py-3 text-muted-foreground">{s.homework_subject}</td>
              <td className="px-4 py-3 text-muted-foreground">{fmtDate(s.submitted_at)}</td>
              <td className="px-4 py-3">
                <StatusBadge status={s.status} />
              </td>
              <td className="px-4 py-3 font-medium">
                {s.grade != null ? s.grade : <span className="text-muted-foreground">—</span>}
              </td>
              <td className="px-4 py-3 max-w-[160px]">
                {s.feedback ? (
                  <span className="truncate text-xs text-muted-foreground">{s.feedback}</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                {s.file_name && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    title={s.file_name}
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChatTab({
  schoolId,
  role,
  myId,
  myName,
  partnerId,
  partnerName,
}: {
  schoolId: string;
  role: string;
  myId: string;
  myName: string;
  partnerId: string;
  partnerName: string;
}) {
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", schoolId, myId, partnerId],
    queryFn: () => getMessages({ data: { partnerId } }),
    refetchInterval: 5000,
  });

  const sendMut = useMutation({
    mutationFn: () => sendMessage({ data: { receiverId: partnerId, body } }),
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: ["messages"] });
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex h-96 flex-col rounded-xl border overflow-hidden">
      <div className="border-b px-4 py-3">
        <p className="font-semibold text-sm">Chat with {partnerName}</p>
        <p className="text-xs text-muted-foreground">Messages are visible to both parties</p>
      </div>
      <div className="flex-1 overflow-y-auto space-y-3 p-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.sender_id === myId;
            return (
              <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${isMe ? "rounded-tr-sm bg-primary text-primary-foreground" : "rounded-tl-sm bg-muted"}`}
                >
                  <p>{m.body}</p>
                  <p
                    className={`mt-1 text-[10px] ${isMe ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                  >
                    {fmtDateTime(m.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>
      <div className="border-t p-3 flex items-center gap-2">
        <Input
          className="flex-1"
          placeholder="Type a message…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && body.trim()) {
              e.preventDefault();
              sendMut.mutate();
            }
          }}
        />
        <Button
          size="icon"
          disabled={!body.trim() || sendMut.isPending}
          onClick={() => sendMut.mutate()}
        >
          {sendMut.isPending ? (
            <Icons.Loader2 className="size-4 animate-spin" />
          ) : (
            <Icons.Send className="size-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
