import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UserCheck,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Save,
  Users,
  Search,
  BookOpen,
} from "lucide-react";
import { useAppState } from "@/app/providers/app-state";
import { useActorParams } from "@/hooks/use-actor-params";
import { listAttendance, saveAttendanceBatch } from "@/rpc/attendance";
import { CLASS_SECTIONS } from "@/data/mock/core";
import { DEMO_CLASS_STUDENTS } from "@/data/mock/people";
import { EmptyState, ErrorState, LoadingCards } from "@/components/feedback/states";
import { FloatingAI } from "@/components/feedback/floating-ai";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { AttendanceStatus } from "@/types";

export const Route = createFileRoute("/app/attendance")({ component: AttendancePage });

function AttendancePage() {
  const { role, actor } = useAppState();
  const actorParams = useActorParams();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Get visible classes
  const classesList = useMemo(() => {
    if (role === "teacher" && actor.id) {
      // Find teacher in classes
      return CLASS_SECTIONS.filter(
        (c) => c.classTeacherId === actor.id || c.label.includes("Grade 9"),
      );
    }
    return CLASS_SECTIONS;
  }, [role, actor]);

  // Set default class on load
  useEffect(() => {
    if (classesList.length > 0 && !selectedClassId) {
      setSelectedClassId(classesList[0].id);
    }
  }, [classesList, selectedClassId]);

  // Queries
  const attendanceQuery = useQuery({
    queryKey: ["attendance-records", actorParams, selectedClassId, selectedDate],
    queryFn: () =>
      listAttendance({ data: { ...actorParams!, classId: selectedClassId, date: selectedDate } }),
    enabled: Boolean(actorParams) && Boolean(selectedClassId) && Boolean(selectedDate),
  });

  // Load students for this class
  const classStudents = useMemo(() => {
    // Re-use full mock rosters of student profiles
    return DEMO_CLASS_STUDENTS.filter(
      (s) => s.classId === selectedClassId || selectedClassId === "cls-9A",
    );
  }, [selectedClassId]);

  // State of the current local attendance marking
  const [localRecords, setLocalRecords] = useState<Record<string, AttendanceStatus>>({});

  // Sync local records with DB when query succeeds
  useEffect(() => {
    if (attendanceQuery.data) {
      const recs: Record<string, AttendanceStatus> = {};
      for (const row of attendanceQuery.data) {
        recs[row.studentId] = row.status;
      }
      // Fill missing student records as present by default (convenient UX)
      for (const student of classStudents) {
        if (!recs[student.id]) {
          recs[student.id] = "present";
        }
      }
      setLocalRecords(recs);
    }
  }, [attendanceQuery.data, classStudents]);

  // Mutation
  const saveMutation = useMutation({
    mutationFn: () => {
      const recordsPayload = classStudents.map((s) => ({
        studentId: s.id,
        studentName: s.name,
        status: localRecords[s.id] || "present",
      }));
      return saveAttendanceBatch({
        data: {
          role,
          actorId: actorParams?.actorId,
          classId: selectedClassId,
          date: selectedDate,
          records: recordsPayload,
        },
      });
    },
    onSuccess: (res) => {
      toast.success(`Successfully saved attendance registers for ${res.count} students.`);
      queryClient.invalidateQueries({ queryKey: ["attendance-records"] });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to save attendance."),
  });

  if (!actorParams) {
    return (
      <EmptyState
        title="Access Denied"
        description="Please select an active identity inside Settings to access school attendance registers."
        icon={<UserCheck className="size-6" />}
      />
    );
  }

  const isStaff = role === "principal" || role === "teacher";
  const recordsList = attendanceQuery.data ?? [];

  const filteredStudents = classStudents.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.admissionNo.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="relative space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
            Operations
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight">Daily Attendance</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Mark, track, and correct daily student presence registers with absolute row-level
            security.
          </p>
        </div>
      </header>

      {/* Control Panel filters */}
      <Card>
        <CardContent className="p-4 grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="att-date-select">Select Date</Label>
            <Input
              id="att-date-select"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="att-class-select">Select Class Section</Label>
            <select
              id="att-class-select"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {classesList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="att-search-input">Search Student</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                id="att-search-input"
                placeholder="Name or roll no..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Marking register grid */}
      <div className="surface-panel p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-3">
          <h2 className="text-lg font-bold flex items-center gap-1.5 text-primary">
            <Users className="size-5" /> Attendance register list ({filteredStudents.length}{" "}
            Students)
          </h2>
          {isStaff && (
            <Button
              size="sm"
              className="gap-1 font-bold"
              disabled={saveMutation.isPending || filteredStudents.length === 0}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save Attendance batch
            </Button>
          )}
        </div>

        {attendanceQuery.isLoading ? (
          <div className="py-12 text-center">
            <Loader2 className="size-6 animate-spin mx-auto text-primary" />
            <p className="text-xs text-muted-foreground mt-2">Loading attendance registers...</p>
          </div>
        ) : classStudents.length === 0 ? (
          <EmptyState
            title="No students found"
            description="There are no active student profiles assigned to this section."
            icon={<Users className="size-6" />}
          />
        ) : (
          <div className="border rounded-xl overflow-hidden divide-y divide-border/60 bg-card">
            {filteredStudents.map((student) => {
              const currentStatus = localRecords[student.id] || "present";
              return (
                <div
                  key={student.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid size-9 place-items-center rounded-lg bg-primary-soft text-primary font-extrabold text-xs">
                      {student.name
                        .split(" ")
                        .map((x) => x[0])
                        .join("")}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground">{student.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Roll No: {student.admissionNo} · Avg score: {student.avgScore}%
                      </p>
                    </div>
                  </div>

                  {/* Toggle controls */}
                  {isStaff ? (
                    <div className="flex flex-wrap gap-1 bg-muted/40 p-1 rounded-xl border w-fit">
                      {[
                        { id: "present", label: "Present", tone: "success" },
                        { id: "absent", label: "Absent", tone: "danger" },
                        { id: "late", label: "Late", tone: "warning" },
                        { id: "leave", label: "Leave", tone: "info" },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() =>
                            setLocalRecords((prev) => ({
                              ...prev,
                              [student.id]: item.id as AttendanceStatus,
                            }))
                          }
                          className={cn(
                            "px-3.5 py-1 text-xs font-bold rounded-lg transition-all",
                            currentStatus === item.id
                              ? item.id === "present"
                                ? "bg-success text-white"
                                : item.id === "absent"
                                  ? "bg-danger text-white"
                                  : item.id === "late"
                                    ? "bg-warning text-warning-foreground"
                                    : "bg-info text-white"
                              : "text-muted-foreground hover:bg-muted",
                          )}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full text-xs font-bold px-3 py-0.5 uppercase",
                        currentStatus === "present"
                          ? "bg-success-soft text-success border-success/20"
                          : currentStatus === "absent"
                            ? "bg-danger-soft text-danger border-danger/20"
                            : currentStatus === "late"
                              ? "bg-warning-soft text-warning border-warning/20"
                              : "bg-info-soft text-info border-info/20",
                      )}
                    >
                      {currentStatus}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <FloatingAI />
    </div>
  );
}
