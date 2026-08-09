// SERVER-ONLY. Attendance Management
import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "./supabase-admin";
import {
  resolveActor,
  assertTeacher,
  assertPrincipal,
  ForbiddenError,
  NotFoundError,
  type ActorRole,
} from "./auth-context";
import type { AttendanceStatus } from "@/types";

export interface AttendanceRecordData {
  id: string;
  schoolId: string;
  date: string;
  studentId: string;
  studentName: string;
  classId: string;
  status: AttendanceStatus;
  markedBy: string;
}

/** Fetch daily attendance records for a class section and date */
export const listAttendance = createServerFn({ method: "GET" })
  .validator((data: { role: string; actorId?: string; classId: string; date: string }) => data)
  .handler(async ({ data }) => {
    const actor = resolveActor({ role: data.role as ActorRole, actorId: data.actorId });

    // Validate that the caller has access to this class
    if (actor.role === "teacher" && !actor.classIds?.includes(data.classId)) {
      throw new ForbiddenError(
        "You can only access attendance registers for classes assigned to you.",
      );
    }

    const { data: rows, error } = await supabaseAdmin
      .from("attendance_records")
      .select("*")
      .eq("school_id", actor.schoolId)
      .eq("class_id", data.classId)
      .eq("date", data.date);

    if (error) {
      throw new Error(error.message);
    }

    return (rows ?? []).map((row) => ({
      id: row.id,
      schoolId: row.school_id,
      date: row.date,
      studentId: row.student_id,
      studentName: row.student_name,
      classId: row.class_id,
      status: row.status as AttendanceStatus,
      markedBy: row.marked_by,
    })) as AttendanceRecordData[];
  });

/** Save or correct multiple student attendance records in a single batch securely */
export const saveAttendanceBatch = createServerFn({ method: "POST" })
  .validator(
    (data: {
      role: string;
      actorId?: string;
      classId: string;
      date: string;
      records: { studentId: string; studentName: string; status: AttendanceStatus }[];
    }) => data,
  )
  .handler(async ({ data }) => {
    const actor = resolveActor({ role: data.role as ActorRole, actorId: data.actorId });

    if (actor.role !== "principal" && actor.role !== "teacher") {
      throw new ForbiddenError("Only teachers or the principal can register attendance records.");
    }

    // Teachers assignment boundary check
    if (actor.role === "teacher" && !actor.classIds?.includes(data.classId)) {
      throw new ForbiddenError("You cannot mark attendance for classes not assigned to you.");
    }

    // Batch upsert to prevent duplicates on the exact (date, student_id) unique constraint
    const upsertRows = data.records.map((r) => ({
      school_id: actor.schoolId,
      date: data.date,
      student_id: r.studentId,
      student_name: r.studentName,
      class_id: data.classId,
      status: r.status,
      marked_by: actor.id,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabaseAdmin
      .from("attendance_records")
      .upsert(upsertRows, { onConflict: "date,student_id" });

    if (error) {
      throw new Error(error.message);
    }

    return { ok: true, count: data.records.length };
  });

/** Fetch all attendance records for a specific student (for student/parent view) */
export const listMyAttendance = createServerFn({ method: "GET" })
  .validator((data: { role: string; actorId?: string; studentId: string }) => data)
  .handler(async ({ data }) => {
    const actor = resolveActor({ role: data.role as ActorRole, actorId: data.actorId });

    // Validate that student belongs to caller's school context
    // Students can only see their own attendance. Parents can see their children's.
    if (actor.role === "student" && actor.id !== data.studentId) {
      throw new ForbiddenError("You can only access your own attendance records.");
    }

    const { data: rows, error } = await supabaseAdmin
      .from("attendance_records")
      .select("*")
      .eq("school_id", actor.schoolId)
      .eq("student_id", data.studentId)
      .order("date", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (rows ?? []).map((row) => ({
      id: row.id,
      schoolId: row.school_id,
      date: row.date,
      studentId: row.student_id,
      studentName: row.student_name,
      classId: row.class_id,
      status: row.status as AttendanceStatus,
      markedBy: row.marked_by,
    })) as AttendanceRecordData[];
  });
