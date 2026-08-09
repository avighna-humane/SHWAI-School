// SERVER-ONLY. Secure school student attendance register RPC stubs.
import { createServerFn } from "@tanstack/react-start";
import { resolveActor, ForbiddenError, NotFoundError } from "./auth-context";

export const listAttendance = createServerFn({ method: "GET" })
  .validator((data: { schoolId: string; classId: string; date: string }) => data)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("./supabase-admin");
    const { schoolId, classId, date } = data;

    // Fetch students of the class section
    const { data: students, error: stdError } = await supabaseAdmin
      .from("profiles")
      .select("id, name, student_profiles(*)")
      .eq("school_id", schoolId)
      .eq("role", "student")
      .eq("student_profiles.class_id", classId);

    if (stdError) {
      throw new Error(stdError.message);
    }

    // Filter to those actually matched in the child profiles
    const classStudents = (students || []).filter((s) => s.student_profiles?.length > 0);

    // Fetch marked attendance records for this date and class
    const { data: records, error: attError } = await supabaseAdmin
      .from("attendance")
      .select("*")
      .eq("class_id", classId)
      .eq("attendance_date", date);

    if (attError) {
      throw new Error(attError.message);
    }

    const recMap = new Map((records || []).map((r) => [r.student_id, r]));

    return classStudents.map((s) => {
      const r = recMap.get(s.id);
      return {
        studentId: s.id,
        name: s.name,
        classId,
        date,
        status: r ? r.status : "present", // default to Present if not marked
        markedBy: r ? r.marked_by : null,
        markedAt: r ? r.created_at : null,
      };
    });
  });

export const markAttendance = createServerFn({ method: "POST" })
  .validator((data: { schoolId: string; classId: string; date: string; markedBy: string; records: { studentId: string; status: string }[] }) => data)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("./supabase-admin");
    const { schoolId, classId, date, markedBy, records } = data;

    if (records.length === 0) return { ok: true };

    const now = new Date().toISOString();

    for (const rec of records) {
      // Perform idempotent UPSERT
      const { data: existing } = await supabaseAdmin
        .from("attendance")
        .select("id")
        .eq("student_id", rec.studentId)
        .eq("attendance_date", date)
        .maybeSingle();

      if (existing) {
        await supabaseAdmin
          .from("attendance")
          .update({
            status: rec.status,
            marked_by: markedBy,
            updated_at: now,
          })
          .eq("id", existing.id);
      } else {
        await supabaseAdmin
          .from("attendance")
          .insert({
            school_id: schoolId,
            student_id: rec.studentId,
            class_id: classId,
            attendance_date: date,
            status: rec.status,
            marked_by: markedBy,
          });
      }
    }

    return { ok: true };
  });
