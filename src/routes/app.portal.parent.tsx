import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  HeartHandshake,
  User,
  GraduationCap,
  CalendarDays,
  UserCheck,
  Megaphone,
  BookOpen,
  MessageSquare,
  Trophy,
  Loader2,
  Phone,
  Sparkles,
} from "lucide-react";
import { useAppState } from "@/app/providers/app-state";
import { useActorParams } from "@/hooks/use-actor-params";
import { listMyAttendance } from "@/rpc/attendance";
import { listCalendarEvents } from "@/rpc/calendar";
import { listNoticesFor } from "@/rpc/notices";
import { DEMO_CLASS_STUDENTS } from "@/data/mock/people";
import { EmptyState, ErrorState, LoadingCards } from "@/components/feedback/states";
import { FloatingAI } from "@/components/feedback/floating-ai";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/portal/parent")({ component: ParentPortalPage });

function ParentPortalPage() {
  const { role } = useAppState();
  const actorParams = useActorParams();
  const [activeTab, setActiveTab] = useState<"overview" | "notices" | "attendance" | "calendar">(
    "overview",
  );

  // Get first mock student Aarav Sharma as default linked ward
  const student = DEMO_CLASS_STUDENTS[0];

  // Queries
  const attendanceQuery = useQuery({
    queryKey: ["ward-attendance", actorParams, student.id],
    queryFn: () =>
      listMyAttendance({ data: { role, actorId: actorParams?.actorId, studentId: student.id } }),
    enabled: Boolean(actorParams) && role === "parent",
  });

  const calendarQuery = useQuery({
    queryKey: ["calendar-events", actorParams],
    queryFn: () => listCalendarEvents({ data: actorParams! }),
    enabled: Boolean(actorParams) && role === "parent",
  });

  const noticesQuery = useQuery({
    queryKey: ["notices-parent", actorParams],
    queryFn: () => listNoticesFor({ data: actorParams! }),
    enabled: Boolean(actorParams) && role === "parent",
  });

  if (role !== "parent" && role !== "admin" && role !== "principal") {
    return (
      <EmptyState
        title="Access Denied"
        description="The parent portal is only accessible to parents or school administrators. Switch your role to Parent to view this portal."
        icon={<HeartHandshake className="size-6" />}
      />
    );
  }

  const attendance = attendanceQuery.data ?? [];
  const calendarEvents = calendarQuery.data ?? [];
  const notices = noticesQuery.data ?? [];

  return (
    <div className="relative space-y-6">
      {/* Parent Header */}
      <header className="surface-panel flex flex-col gap-4 p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary font-bold text-lg border border-primary/20">
            RS
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight">Rajesh Sharma</h1>
              <Badge
                variant="outline"
                className="rounded-full bg-success-soft text-success border-success/20 text-[10px]"
              >
                Parent / Guardian Portal
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Guardian of Aarav Sharma (Grade 9) & Ananya Sharma (Grade 6)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="rounded-xl border bg-muted/30 p-2.5 px-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Linked Wards
            </p>
            <p className="text-lg font-black text-primary">2 Students</p>
          </div>
          <div className="rounded-xl border bg-muted/30 p-2.5 px-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Preferred Lang
            </p>
            <p className="text-lg font-black text-success uppercase">English</p>
          </div>
        </div>
      </header>

      {/* Ward Switcher Row */}
      <div className="flex items-center gap-3 bg-muted/20 border p-4 rounded-xl">
        <GraduationCap className="size-5 text-primary shrink-0" />
        <span className="text-sm font-bold text-muted-foreground">Currently Viewing:</span>
        <Badge
          variant="secondary"
          className="rounded-full font-bold px-3 py-1 cursor-pointer bg-primary text-white"
        >
          Aarav Sharma (Grade 9 — A)
        </Badge>
        <Badge
          variant="outline"
          className="rounded-full font-bold px-3 py-1 cursor-not-allowed text-muted-foreground opacity-60"
        >
          Ananya Sharma (Grade 6 — B)
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        <TabsList className="flex flex-wrap rounded-xl bg-card p-1 shadow-sm border border-border/50">
          <TabsTrigger value="overview" className="text-xs gap-1.5">
            <Sparkles className="size-3.5" /> Child Overview
          </TabsTrigger>
          <TabsTrigger value="notices" className="text-xs gap-1.5">
            <Megaphone className="size-3.5" /> School Notices ({notices.length})
          </TabsTrigger>
          <TabsTrigger value="attendance" className="text-xs gap-1.5">
            <UserCheck className="size-3.5" /> Ward Attendance ({attendance.length} marked)
          </TabsTrigger>
          <TabsTrigger value="calendar" className="text-xs gap-1.5">
            <CalendarDays className="size-3.5" /> Calendar & Events ({calendarEvents.length})
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <UserCheck className="size-4 text-success" /> Attendance Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-black text-success">{student.attendancePct}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Excellent class presence, above average.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <BookOpen className="size-4 text-primary" /> Gradebook Average
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-black text-primary">{student.avgScore}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Consistently scoring high marks across tests.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <Trophy className="size-4 text-warning" /> Socratic XP & Streaks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-black text-warning">{student.xp} XP</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Completed {student.homeworkCompletion}% of homework assignments.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notices Tab */}
        <TabsContent value="notices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold">
                School Announcements for Parents
              </CardTitle>
              <CardDescription>
                Targeted notices published for parents and guardians.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {noticesQuery.isLoading ? (
                <div className="py-10 text-center">
                  <Loader2 className="size-5 animate-spin mx-auto text-primary" />
                </div>
              ) : notices.length === 0 ? (
                <EmptyState
                  title="No notices published"
                  description="There are no announcements published at this time."
                  icon={<Megaphone className="size-6" />}
                />
              ) : (
                <div className="space-y-3.5">
                  {notices.map((n: any) => (
                    <div
                      key={n.id}
                      className="p-4 border rounded-xl bg-card hover:bg-muted/10 transition-colors flex flex-col gap-1.5"
                    >
                      <h3 className="font-bold text-base text-primary">{n.title}</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {n.body}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Circular by {n.authorName} on {formatDateTime(n.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold">Verified Attendance History</CardTitle>
              <CardDescription>Daily verified presence records of Aarav Sharma.</CardDescription>
            </CardHeader>
            <CardContent>
              {attendanceQuery.isLoading ? (
                <div className="py-10 text-center">
                  <Loader2 className="size-5 animate-spin mx-auto text-primary" />
                </div>
              ) : attendance.length === 0 ? (
                <div className="p-5 border border-dashed rounded-xl text-center bg-card">
                  <p className="text-xs text-muted-foreground">
                    No custom attendance entries recorded yet for this term. Standard full
                    attendance rate.
                  </p>
                </div>
              ) : (
                <div className="border rounded-xl divide-y bg-card overflow-hidden">
                  {attendance.map((row) => (
                    <div key={row.id} className="flex justify-between items-center p-3.5 px-4">
                      <div>
                        <p className="font-bold text-sm">{formatDate(row.date)}</p>
                        <p className="text-[10px] text-muted-foreground">Class section register</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "rounded-full text-[10px] uppercase font-bold",
                          row.status === "present"
                            ? "bg-success-soft text-success border-success/20"
                            : row.status === "absent"
                              ? "bg-danger-soft text-danger border-danger/20"
                              : "bg-warning-soft text-warning border-warning/20",
                        )}
                      >
                        {row.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold">PTM & School Events Schedule</CardTitle>
              <CardDescription>School calendar events targeted to parents.</CardDescription>
            </CardHeader>
            <CardContent>
              {calendarQuery.isLoading ? (
                <div className="py-10 text-center">
                  <Loader2 className="size-5 animate-spin mx-auto text-primary" />
                </div>
              ) : calendarEvents.length === 0 ? (
                <EmptyState
                  title="No events found"
                  description="There are no parent events scheduled for this month."
                  icon={<CalendarDays className="size-6" />}
                />
              ) : (
                <div className="space-y-3">
                  {calendarEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-3.5 border rounded-xl bg-card flex flex-col gap-1"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase font-bold rounded-full"
                        >
                          {evt.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(evt.date)}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm">{evt.title}</h3>
                      <p className="text-xs text-muted-foreground">{evt.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <FloatingAI />
    </div>
  );
}
