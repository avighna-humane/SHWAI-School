import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UserCheck,
  CalendarDays,
  Plus,
  Trash2,
  Loader2,
  Check,
  X,
  Users,
  Search,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { useAppState } from "@/app/providers/app-state";
import { useActorParams } from "@/hooks/use-actor-params";
import { listAttendance, markAttendance } from "@/rpc/attendance";
import { CLASS_SECTIONS } from "@/data/mock/core";
import { EmptyState, ErrorState, LoadingCards } from "@/components/feedback/states";
import { FloatingAI } from "@/components/feedback/floating-ai";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/app/attendance")({ component: AttendancePage });

function AttendancePage() {
  const { role, schoolId, actor } = useAppState();
  const actorParams = useActorParams();
  const queryClient = useQueryClient();
  const [selectedClassId, setSelectedClassId] = useState(CLASS_SECTIONS[0]?.id || "");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [searchQuery, setSearchQuery] = useState("");

  const isTeacher = role === "teacher" || role === "principal" || role === "admin";

  // Queries
  const attendanceQuery = useQuery({
    queryKey: ["attendance-list", schoolId, selectedClassId, selectedDate],
    queryFn: () => listAttendance({ data: { schoolId, classId: selectedClassId, date: selectedDate } }),
    enabled: Boolean(schoolId) && Boolean(selectedClassId) && isTeacher,
  });

  const studentsRoster = attendanceQuery.data ?? [];

  // Temporary local state for modifications before saving
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({});

  useMemo(() => {
    // Sync local state when DB query completes
    const initial: Record<string, string> = {};
    for (const r of studentsRoster) {
      initial[r.studentId] = r.status;
    }
    setLocalStatuses(initial);
  }, [studentsRoster]);

  const markMutation = useMutation({
    mutationFn: () => {
      const records = Object.entries(localStatuses).map(([studentId, status]) => ({
        studentId,
        status,
      }));
      return markAttendance({
        data: {
          schoolId,
          classId: selectedClassId,
          date: selectedDate,
          markedBy: actor.id,
          records,
        },
      });
    },
    onSuccess: () => {
      toast.success("Attendance register updated successfully");
      queryClient.invalidateQueries({ queryKey: ["attendance-list"] });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to mark attendance"),
  });

  const filteredRoster = useMemo(() => {
    return studentsRoster.filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [studentsRoster, searchQuery]);

  if (!isTeacher) {
    return (
      <div className="relative space-y-6">
        <header>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Attendance</p>
          <h1 className="text-3xl font-extrabold tracking-tight">My Attendance</h1>
          <p className="mt-2 text-sm text-muted-foreground">View your active attendance history and logs.</p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-1.5">
              <UserCheck className="size-5 text-primary" /> Attendance Log
            </CardTitle>
            <CardDescription>Your personal attendance record for the semester.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl border bg-success-soft/20 border-success/20 flex justify-between items-center text-sm font-bold text-success">
              <span>Overall Attendance Percentage</span>
              <span>95.4% (Eligible for exams)</span>
            </div>

            <div className="border rounded-xl divide-y">
              {[
                { date: "Today", status: "Present" },
                { date: "Yesterday", status: "Present" },
                { date: "07 Aug 2026", status: "Present" },
                { date: "06 Aug 2026", status: "Present" },
                { date: "05 Aug 2026", status: "Absent", reason: "Medical leave" }
              ].map((row, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 px-4 text-xs font-semibold select-none">
                  <div>
                    <p className="font-bold">{row.date}</p>
                    {row.reason && <p className="text-[10px] text-muted-foreground font-normal italic mt-0.5">{row.reason}</p>}
                  </div>
                  <Badge variant="outline" className={cn("rounded-full text-[10px]", row.status === "Present" ? "border-success/30 bg-success-soft text-success" : "border-danger/30 bg-danger-soft text-danger")}>
                    {row.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <FloatingAI />
      </div>
    );
  }

  return (
    <div className="relative space-y-6">
      <header>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Attendance</p>
        <h1 className="text-3xl font-extrabold tracking-tight">Attendance Register</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Mark and manage student attendance by class and date. Confirm student presence, absences, or leaves.
        </p>
      </header>

      {/* Roster Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center border-b pb-4">
        <div className="flex flex-wrap gap-3">
          <div className="space-y-1">
            <Label htmlFor="att-class" className="text-xs font-bold text-muted-foreground uppercase">Class Section</Label>
            <select
              id="att-class"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="h-9 w-44 rounded-md border border-input bg-background px-3 text-xs"
            >
              {CLASS_SECTIONS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="att-date" className="text-xs font-bold text-muted-foreground uppercase">Date</Label>
            <Input
              id="att-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-9 w-40 text-xs"
            />
          </div>
        </div>

        <div className="relative w-full sm:max-w-xs self-end">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* Roster Table */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between border-b">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-1.5">
              <Users className="size-5 text-primary" /> Roster Register
            </CardTitle>
            <CardDescription>Class students register for {formatDate(selectedDate)}.</CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => markMutation.mutate()}
            disabled={markMutation.isPending}
            className="h-8 text-xs font-bold"
          >
            {markMutation.isPending && <Loader2 className="size-3 animate-spin mr-1" />} Save Attendance
          </Button>
        </CardHeader>
        <CardContent className="pt-4 px-3">
          {attendanceQuery.isLoading ? (
            <div className="py-10 text-center"><Loader2 className="size-6 animate-spin mx-auto text-primary" /></div>
          ) : filteredRoster.length === 0 ? (
            <EmptyState title="No students" description="No student profiles are registered in this class section." icon={<Users className="size-6" />} />
          ) : (
            <div className="border rounded-xl overflow-hidden divide-y">
              {filteredRoster.map((row) => {
                const currentStatus = localStatuses[row.studentId] || "present";
                return (
                  <div key={row.studentId} className="flex justify-between items-center p-3 px-4 hover:bg-muted/10 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-foreground truncate">{row.name}</p>
                      <p className="text-[10px] text-muted-foreground">ID: {row.studentId}</p>
                    </div>

                    <div className="flex gap-1.5 shrink-0">
                      {["present", "absent", "late", "leave"].map((st) => {
                        const active = currentStatus === st;
                        return (
                          <Button
                            key={st}
                            size="sm"
                            variant={active ? "default" : "outline"}
                            onClick={() => {
                              setLocalStatuses((prev) => ({
                                ...prev,
                                [row.studentId]: st,
                              }));
                            }}
                            className={cn(
                              "h-7 text-[10px] capitalize px-2.5 font-bold rounded-lg border-border/40",
                              active && st === "present" && "bg-success text-white hover:bg-success/90",
                              active && st === "absent" && "bg-danger text-white hover:bg-danger/90",
                              active && st === "late" && "bg-warning text-warning-foreground hover:bg-warning/90",
                              active && st === "leave" && "bg-info text-white hover:bg-info/90"
                            )}
                          >
                            {st}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <FloatingAI />
    </div>
  );
}
