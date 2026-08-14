import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireDatabase } from "@/lib/db";
import { requireAuth, requireRole, type AuthContext } from "@/lib/auth";

export type AttendanceStatus = "present" | "absent" | "late" | "leave";

export interface AttendanceRow {
  id: string;
  school_id: string;
  student_id: string;
  student_name: string;
  class_id: string;
  date: string;
  status: AttendanceStatus;
  marked_by: string;
  marked_at: string;
  synced: boolean;
}

const staffRoles: AuthContext["role"][] = ["teacher", "staff", "principal", "admin", "owner"];
const listInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  studentId: z.string().min(1).optional(),
});
const recordInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  records: z
    .array(
      z.object({
        studentId: z.string().min(1),
        studentName: z.string().min(1),
        classId: z.string().min(1),
        status: z.enum(["present", "absent", "late", "leave"]),
      }),
    )
    .min(1)
    .max(250),
});

async function assertStudentAccess(
  sql: ReturnType<typeof requireDatabase>,
  context: AuthContext,
  studentId: string,
) {
  if (context.role === "student" && studentId !== context.userId)
    throw new Error("Students may only view their own attendance");
  if (context.role === "parent") {
    const linked = await sql<{ linked: boolean }[]>`
      SELECT EXISTS(
        SELECT 1 FROM hw_parent_students
        WHERE parent_id = ${context.userId} AND school_id = ${context.schoolId} AND student_id = ${studentId} AND active = TRUE
      ) AS linked`;
    if (!linked[0]?.linked) throw new Error("Parent is not linked to this student");
  }
}

export const listAttendance = createServerFn({ method: "POST" })
  .validator(listInput)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    const sql = requireDatabase();
    if (data.studentId) await assertStudentAccess(sql, context, data.studentId);
    if (!data.studentId) requireRole(context, staffRoles);

    return data.studentId
      ? sql<AttendanceRow[]>`
          SELECT id, school_id, student_id, student_name, class_id, date::text,
                 status, marked_by, marked_at, synced
          FROM hw_attendance
          WHERE school_id = ${context.schoolId} AND date = ${data.date} AND student_id = ${data.studentId}
          ORDER BY student_name`
      : sql<AttendanceRow[]>`
          SELECT id, school_id, student_id, student_name, class_id, date::text,
                 status, marked_by, marked_at, synced
          FROM hw_attendance
          WHERE school_id = ${context.schoolId} AND date = ${data.date}
          ORDER BY class_id, student_name`;
  });

export const saveAttendance = createServerFn({ method: "POST" })
  .validator(recordInput)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, staffRoles);
    const sql = requireDatabase();
    const saved: AttendanceRow[] = [];

    for (const record of data.records) {
      const rows = await sql<AttendanceRow[]>`
        INSERT INTO hw_attendance
          (school_id, student_id, student_name, class_id, date, status, marked_by, marked_at, synced)
        VALUES
          (${context.schoolId}, ${record.studentId}, ${record.studentName}, ${record.classId}, ${data.date},
           ${record.status}, ${context.userId}, NOW(), TRUE)
        ON CONFLICT (school_id, student_id, date) DO UPDATE SET
          student_name = EXCLUDED.student_name,
          class_id = EXCLUDED.class_id,
          status = EXCLUDED.status,
          marked_by = EXCLUDED.marked_by,
          marked_at = NOW(),
          synced = TRUE
        RETURNING id, school_id, student_id, student_name, class_id, date::text,
                  status, marked_by, marked_at, synced`;
      if (rows[0]) saved.push(rows[0]);
    }

    await sql`
      INSERT INTO hw_audit_events
        (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail)
      VALUES
        (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role},
         'edit', 'attendance', ${data.date}, ${`Saved ${saved.length} attendance records`})`;

    return { ok: true as const, saved };
  });
