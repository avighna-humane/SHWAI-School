import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  IdCard,
  User,
  CalendarDays,
  Briefcase,
  Megaphone,
  Plus,
  Loader2,
  Lock,
  Sparkles,
} from "lucide-react";
import { useAppState } from "@/app/providers/app-state";
import { useActorParams } from "@/hooks/use-actor-params";
import { listCalendarEvents } from "@/rpc/calendar";
import { listTeacherNoticesFor } from "@/rpc/notices";
import { EmptyState, ErrorState, LoadingCards } from "@/components/feedback/states";
import { FloatingAI } from "@/components/feedback/floating-ai";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/portal/staff")({ component: StaffPortalPage });

function StaffPortalPage() {
  const { role } = useAppState();
  const actorParams = useActorParams();
  const [activeTab, setActiveTab] = useState<"overview" | "notices" | "calendar">("overview");

  // Queries
  const calendarQuery = useQuery({
    queryKey: ["calendar-events-staff", actorParams],
    queryFn: () => listCalendarEvents({ data: actorParams! }),
    enabled: Boolean(actorParams),
  });

  const noticesQuery = useQuery({
    queryKey: ["notices-staff", actorParams],
    queryFn: () => listTeacherNoticesFor({ data: actorParams! }),
    enabled: Boolean(actorParams),
  });

  // Only Principal, Teachers, Owners, or Staff members can view the staff portal
  const hasAccess = ["principal", "teacher", "owner", "admin"].includes(role);

  if (!hasAccess) {
    return (
      <EmptyState
        title="Access Denied"
        description="The staff portal is restricted to school staff and administrators. Go to Settings to view your credentials."
        icon={<IdCard className="size-6" />}
      />
    );
  }

  const staffNotices = noticesQuery.data ?? [];
  const calendarEvents = calendarQuery.data ?? [];

  return (
    <div className="relative space-y-6">
      {/* Staff Header */}
      <header className="surface-panel flex flex-col gap-4 p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary font-bold text-lg border border-primary/20">
            ST
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight">School Staff Workspace</h1>
              <Badge
                variant="outline"
                className="rounded-full bg-ai-soft text-ai border-ai/20 text-[10px]"
              >
                Administrative Controls
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage school duties, view official board circulars, and coordinate with
              administrative units.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="rounded-xl border bg-muted/30 p-2.5 px-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Department
            </p>
            <p className="text-lg font-black text-primary">Operations</p>
          </div>
          <div className="rounded-xl border bg-muted/30 p-2.5 px-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Leave Balance
            </p>
            <p className="text-lg font-black text-success">14 Days</p>
          </div>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        <TabsList className="flex flex-wrap rounded-xl bg-card p-1 shadow-sm border border-border/50">
          <TabsTrigger value="overview" className="text-xs gap-1.5">
            <Sparkles className="size-3.5" /> Staff Duties
          </TabsTrigger>
          <TabsTrigger value="notices" className="text-xs gap-1.5">
            <Megaphone className="size-3.5" /> Staff Circulars ({staffNotices.length})
          </TabsTrigger>
          <TabsTrigger value="calendar" className="text-xs gap-1.5">
            <CalendarDays className="size-3.5" /> Staff Calendar ({calendarEvents.length})
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <Briefcase className="size-4 text-primary" /> Active Duties
                </CardTitle>
                <CardDescription>Your current administrative assignments.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center text-sm border-b pb-2.5 last:border-0 last:pb-0">
                  <div>
                    <p className="font-bold">Weekly Assembly Coordination</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Primary Wing Assembly</p>
                  </div>
                  <Badge className="bg-success text-white">Active</Badge>
                </div>
                <div className="flex justify-between items-center text-sm border-b pb-2.5 last:border-0 last:pb-0">
                  <div>
                    <p className="font-bold">Unit Test Invigilation</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Grade 9 Mathematics Test</p>
                  </div>
                  <Badge variant="secondary">Scheduled</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <CalendarDays className="size-4 text-success" /> Leave Status
                </CardTitle>
                <CardDescription>Track leave balance and history.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-muted-foreground">Casual Leaves Balance</span>
                  <span>14 / 18 Days remaining</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-success rounded-full transition-all duration-300"
                    style={{ width: "75%" }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Staff Circulars Tab */}
        <TabsContent value="notices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold">Principal Staff Directives</CardTitle>
              <CardDescription>
                Official circulars and directives published solely for school staff.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {noticesQuery.isLoading ? (
                <div className="py-10 text-center">
                  <Loader2 className="size-5 animate-spin mx-auto text-primary" />
                </div>
              ) : staffNotices.length === 0 ? (
                <EmptyState
                  title="No circulars"
                  description="No directives have been published at this time."
                  icon={<Megaphone className="size-6" />}
                />
              ) : (
                <div className="space-y-3.5">
                  {staffNotices.map((n: any) => (
                    <div
                      key={n.id}
                      className="p-4 border rounded-xl bg-card hover:bg-muted/10 transition-colors flex flex-col gap-1"
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

        {/* Staff Calendar Tab */}
        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold">Staff Calendar & Meetings</CardTitle>
              <CardDescription>
                Upcoming administrative meetings and gazetted schedules.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {calendarQuery.isLoading ? (
                <div className="py-10 text-center">
                  <Loader2 className="size-5 animate-spin mx-auto text-primary" />
                </div>
              ) : calendarEvents.length === 0 ? (
                <EmptyState
                  title="No events scheduled"
                  description="There are no active staff events scheduled."
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
