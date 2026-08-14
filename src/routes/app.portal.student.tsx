import { createFileRoute, Link } from "@tanstack/react-router";
import * as Icons from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { listStudents } from "@/actions/people";
import { useAppState } from "@/app/providers/app-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/portal/student")({ component: StudentPortal });

const PORTAL_CARDS = [
  {
    icon: "Megaphone",
    label: "Notices",
    description: "School announcements and important updates from your teachers and principal.",
    path: "/app/notices",
    primary: "View Notices",
    badge: "New" as const,
    highlight: true,
  },
  {
    icon: "NotebookPen",
    label: "Homework",
    description: "View assigned homework and submit your work.",
    path: "/app/homework",
    primary: "Open Homework",
  },
  {
    icon: "CalendarRange",
    label: "Timetable",
    description: "Your class schedule and period timings.",
    path: "/app/timetable",
    primary: "View Timetable",
  },
  {
    icon: "FileSpreadsheet",
    label: "Exams",
    description: "Upcoming exams, results and evaluation details.",
    path: "/app/exams",
    primary: "View Exams",
  },
  {
    icon: "UserCheck",
    label: "Attendance",
    description: "Your attendance record and statistics.",
    path: "/app/attendance",
    primary: "View Attendance",
  },
  {
    icon: "MessageCircle",
    label: "Chat",
    description: "Message your teachers directly.",
    path: "/app/chat",
    primary: "Open Chat",
  },
];

function Icon({ name, className }: { name: string; className?: string }) {
  const C = (Icons as unknown as Record<string, Icons.LucideIcon>)[name] ?? Icons.Circle;
  return <C className={className} aria-hidden />;
}

function StudentPortal() {
  const { user, schoolId } = useAppState();
  const studentQuery = useQuery({
    queryKey: ["portal-student", schoolId],
    queryFn: () => listStudents({ data: { status: "active" } }),
    enabled: Boolean(schoolId) && typeof window !== "undefined",
  });
  const student = studentQuery.data?.[0];

  return (
    <div className="space-y-6">
      <header>
        <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
          <span className="size-1.5 rounded-full bg-primary" /> SHWAI WORKSPACE
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight">Student Portal</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Welcome, {user.name}. Your academic workspace — homework, notices, timetable and more.
        </p>
      </header>

      {studentQuery.isLoading ? (
        <div className="surface-panel flex items-center gap-2 p-4 text-sm text-muted-foreground">
          <Icons.Loader2 className="size-4 animate-spin" />
          Loading your persisted student profile…
        </div>
      ) : studentQuery.isError ? (
        <div className="surface-panel flex items-center gap-2 p-4 text-sm text-danger">
          <Icons.DatabaseZap className="size-4" />
          {(studentQuery.error as Error).message}
        </div>
      ) : student ? (
        <div className="surface-panel grid gap-4 p-5 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Student</p>
            <p className="mt-1 font-semibold">{student.name}</p>
            <p className="text-xs text-muted-foreground">{student.admission_no}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Class</p>
            <p className="mt-1 font-semibold">{student.class_label ?? "Unassigned"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Section</p>
            <p className="mt-1 font-semibold">{student.section_name ?? "Unassigned"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Academic year</p>
            <p className="mt-1 font-semibold">{student.academic_year_label ?? "Not assigned"}</p>
          </div>
        </div>
      ) : (
        <div className="surface-panel p-4 text-sm text-muted-foreground">
          No persisted student profile is linked to this authenticated account yet.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PORTAL_CARDS.map((card) => (
          <div
            key={card.path}
            className={`flex flex-col rounded-xl border p-5 shadow-sm transition-shadow hover:shadow-md
              ${card.highlight ? "border-primary/30 bg-primary/5" : "bg-card"}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div
                className={`flex size-10 items-center justify-center rounded-lg
                ${card.highlight ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
              >
                <Icon name={card.icon} className="size-5" />
              </div>
              {card.badge && (
                <Badge className="shrink-0 rounded-full bg-ai-soft px-2 text-[10px] text-ai">
                  {card.badge}
                </Badge>
              )}
            </div>

            <h2 className={`mt-3 text-base font-semibold ${card.highlight ? "text-primary" : ""}`}>
              {card.label}
            </h2>
            <p className="mt-1 flex-1 text-sm text-muted-foreground">{card.description}</p>

            <div className="mt-4 flex items-center gap-2">
              <Button
                asChild
                size="sm"
                variant={card.highlight ? "default" : "outline"}
                className="flex-1"
              >
                <Link to={card.path}>{card.primary}</Link>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
