import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireDatabase } from "@/lib/db";

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

const roles = ["teacher", "principal", "admin", "owner", "student", "parent"] as const;
const staffRoles = ["teacher", "principal", "admin", "owner"] as const;

const listInput = z.object({
  schoolId: z.string().min(1),
  actorSchoolId: z.string().min(1),
  actorRole: z.enum(roles),
  actorId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  studentId: z.string().min(1).optional(),
});

const recordInput = z.object({
  schoolId: z.string().min(1),
  actorSchoolId: z.string().min(1),
  actorRole: z.enum(staffRoles),
  actorId: z.string().min(1),
  actorName: z.string().min(1),
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

function assertTenant(targetSchoolId: string, actorSchoolId: string) {
  if (targetSchoolId !== actorSchoolId) throw new Error("Cross-school access denied");
}

export const listAttendance = createServerFn({ method: "POST" })
  .validator(listInput)
  .handler(async ({ data }) => {
    assertTenant(data.schoolId, data.actorSchoolId);
    if (data.actorRole === "student" && data.studentId !== data.actorId)
      throw new Error("Students may only view their own attendance");
    if (data.actorRole === "parent" && !data.studentId)
      throw new Error("A ward is required to view parent attendance");

    const sql = requireDatabase();
    if (data.studentId) {
      return sql<AttendanceRow[]>`
        SELECT id, school_id, student_id, student_name, class_id, date::text,
               status, marked_by, marked_at, synced
        FROM hw_attendance
        WHERE school_id = ${data.schoolId} AND date = ${data.date} AND student_id = ${data.studentId}
        ORDER BY student_name`;
    }
    if (![...staffRoles].includes(data.actorRole as (typeof staffRoles)[number]))
      throw new Error("Permission denied");
    return sql<AttendanceRow[]>`
      SELECT id, school_id, student_id, student_name, class_id, date::text,
             status, marked_by, marked_at, synced
      FROM hw_attendance
      WHERE school_id = ${data.schoolId} AND date = ${data.date}
      ORDER BY class_id, student_name`;
  });

export const saveAttendance = createServerFn({ method: "POST" })
  .validator(recordInput)
  .handler(async ({ data }) => {
    assertTenant(data.schoolId, data.actorSchoolId);
    const sql = requireDatabase();
    const saved: AttendanceRow[] = [];

    for (const record of data.records) {
      const rows = await sql<AttendanceRow[]>`
        INSERT INTO hw_attendance
          (school_id, student_id, student_name, class_id, date, status, marked_by, marked_at, synced)
        VALUES
          (${data.schoolId}, ${record.studentId}, ${record.studentName}, ${record.classId}, ${data.date},
           ${record.status}, ${data.actorId}, NOW(), TRUE)
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
        (${data.schoolId}, ${data.actorId}, ${data.actorName}, ${data.actorRole},
         'edit', 'attendance', ${data.date}, ${`Saved ${saved.length} attendance records`})`;

    return { ok: true as const, saved };
  });
