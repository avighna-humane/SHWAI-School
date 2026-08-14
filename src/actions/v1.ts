import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth, requireRole } from "@/lib/auth";
import { requireDatabase } from "@/lib/db";

const staffRoles = ["staff", "teacher", "principal", "admin", "owner"] as const;
const leadershipRoles = ["principal", "admin", "owner"] as const;

export interface CalendarEventRow {
  id: string;
  school_id: string;
  title: string;
  description: string;
  event_type: string;
  starts_at: string;
  ends_at: string | null;
  audience: string[];
  created_by: string;
  created_at: string;
}

export interface DocumentRow {
  id: string;
  school_id: string;
  title: string;
  category: string;
  storage_key: string | null;
  mime_type: string | null;
  size_bytes: number;
  audience: string[];
  created_by: string;
  created_at: string;
}

export interface LeaveRow {
  id: string;
  school_id: string;
  requester_id: string;
  requester_role: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  reviewed_by: string | null;
  created_at: string;
}

const calendarInput = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).default(""),
  eventType: z.string().trim().min(2).max(50),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  audience: z.array(z.string().min(1)).min(1).max(20),
});

export const listCalendarEvents = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  const sql = requireDatabase();
  return sql<CalendarEventRow[]>`
    SELECT * FROM hw_calendar_events
    WHERE school_id = ${context.schoolId}
      AND (audience && ARRAY['entire-school', ${context.role}]::TEXT[])
    ORDER BY starts_at ASC LIMIT 500`;
});

export const createCalendarEvent = createServerFn({ method: "POST" })
  .validator(calendarInput)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, staffRoles);
    const sql = requireDatabase();
    const rows = await sql<CalendarEventRow[]>`
      INSERT INTO hw_calendar_events
        (school_id, title, description, event_type, starts_at, ends_at, audience, created_by)
      VALUES
        (${context.schoolId}, ${data.title}, ${data.description}, ${data.eventType}, ${data.startsAt},
         ${data.endsAt ?? null}, ${data.audience}, ${context.userId})
      RETURNING *`;
    return rows[0]!;
  });

export const listDocuments = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  const sql = requireDatabase();
  if (staffRoles.includes(context.role as (typeof staffRoles)[number])) {
    return sql<DocumentRow[]>`
      SELECT * FROM hw_documents WHERE school_id = ${context.schoolId} ORDER BY created_at DESC LIMIT 500`;
  }
  return sql<DocumentRow[]>`
    SELECT * FROM hw_documents
    WHERE school_id = ${context.schoolId} AND audience && ARRAY['entire-school', ${context.role}]::TEXT[]
    ORDER BY created_at DESC LIMIT 500`;
});

export const createDocumentMetadata = createServerFn({ method: "POST" })
  .validator(
    z.object({
      title: z.string().trim().min(2).max(160),
      category: z.string().trim().min(2).max(50),
      storageKey: z.string().trim().max(500).optional(),
      mimeType: z.string().trim().max(120).optional(),
      sizeBytes: z.number().int().min(0).max(50_000_000).default(0),
      audience: z.array(z.string().min(1)).min(1).max(20),
    }),
  )
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, staffRoles);
    const sql = requireDatabase();
    const rows = await sql<DocumentRow[]>`
      INSERT INTO hw_documents
        (school_id, title, category, storage_key, mime_type, size_bytes, audience, created_by)
      VALUES
        (${context.schoolId}, ${data.title}, ${data.category}, ${data.storageKey ?? null}, ${data.mimeType ?? null}, ${data.sizeBytes}, ${data.audience}, ${context.userId})
      RETURNING *`;
    return rows[0]!;
  });

const leaveInput = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().trim().min(2).max(1000),
});

export const createLeaveRequest = createServerFn({ method: "POST" })
  .validator(leaveInput)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    const sql = requireDatabase();
    if (data.endDate < data.startDate)
      throw new Error("Leave end date must be on or after the start date");
    const rows = await sql<LeaveRow[]>`
      INSERT INTO hw_leave_requests
        (school_id, requester_id, requester_role, start_date, end_date, reason)
      VALUES
        (${context.schoolId}, ${context.userId}, ${context.role}, ${data.startDate}, ${data.endDate}, ${data.reason})
      RETURNING *`;
    return rows[0]!;
  });

export const listLeaveRequests = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  const sql = requireDatabase();
  if (staffRoles.includes(context.role as (typeof staffRoles)[number])) {
    return sql<LeaveRow[]>`
      SELECT * FROM hw_leave_requests WHERE school_id = ${context.schoolId} ORDER BY created_at DESC LIMIT 500`;
  }
  return sql<LeaveRow[]>`
    SELECT * FROM hw_leave_requests WHERE school_id = ${context.schoolId} AND requester_id = ${context.userId} ORDER BY created_at DESC`;
});

export const reviewLeaveRequest = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1), status: z.enum(["approved", "rejected"]) }))
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, leadershipRoles);
    const sql = requireDatabase();
    const rows = await sql<LeaveRow[]>`
      UPDATE hw_leave_requests
      SET status = ${data.status}, reviewed_by = ${context.userId}
      WHERE id = ${data.id} AND school_id = ${context.schoolId}
      RETURNING *`;
    if (!rows[0]) throw new Error("Leave request not found or not authorized");
    return rows[0];
  });

export const generateStudentIdCard = createServerFn({ method: "POST" })
  .validator(z.object({ studentId: z.string().min(1), academicYearId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, staffRoles);
    const sql = requireDatabase();
    const rows = await sql<
      {
        id: string;
        student_id: string;
        student_name: string;
        admission_no: string;
        school_name: string;
        class_label: string | null;
        section_name: string | null;
        academic_year_label: string;
      }[]
    >`
      WITH card AS (
        INSERT INTO hw_id_cards (school_id, student_id, academic_year_id, generated_by)
        SELECT ${context.schoolId}, ${data.studentId}, ${data.academicYearId}, ${context.userId}
        WHERE EXISTS (SELECT 1 FROM hw_students WHERE id = ${data.studentId} AND school_id = ${context.schoolId})
        ON CONFLICT (student_id, academic_year_id) DO UPDATE SET generated_by = EXCLUDED.generated_by, created_at = NOW()
        RETURNING id, student_id
      )
      SELECT card.id, st.id AS student_id, st.name AS student_name, st.admission_no, school.name AS school_name,
             cls.label AS class_label, sec.name AS section_name, ay.label AS academic_year_label
      FROM card
      JOIN hw_students st ON st.id = card.student_id
      JOIN hw_schools school ON school.id = st.school_id
      LEFT JOIN hw_enrollments e ON e.student_id = st.id AND e.academic_year_id = ${data.academicYearId}
      LEFT JOIN hw_classes cls ON cls.id = e.class_id
      LEFT JOIN hw_sections sec ON sec.id = e.section_id
      JOIN hw_academic_years ay ON ay.id = ${data.academicYearId} AND ay.school_id = ${context.schoolId}`;
    if (!rows[0]) throw new Error("Student or academic year not found in this school");
    return rows[0];
  });

export const transitionToAlumni = createServerFn({ method: "POST" })
  .validator(
    z.object({
      studentId: z.string().min(1),
      graduationYearId: z.string().min(1),
      graduationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      destination: z.string().trim().max(200).optional(),
      notes: z.string().trim().max(1000).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, leadershipRoles);
    const sql = requireDatabase();
    await sql.begin(async (tx) => {
      const updated = await tx<{ id: string }[]>`
        UPDATE hw_students SET status = 'alumni', updated_at = NOW()
        WHERE id = ${data.studentId} AND school_id = ${context.schoolId}
        RETURNING id`;
      if (!updated[0]) throw new Error("Student not found or not authorized");
      await tx`
        INSERT INTO hw_alumni (student_id, school_id, graduation_year_id, graduation_date, destination, notes)
        VALUES (${data.studentId}, ${context.schoolId}, ${data.graduationYearId}, ${data.graduationDate}, ${data.destination ?? null}, ${data.notes ?? ""})
        ON CONFLICT (student_id) DO UPDATE SET graduation_year_id = EXCLUDED.graduation_year_id, graduation_date = EXCLUDED.graduation_date, destination = EXCLUDED.destination, notes = EXCLUDED.notes`;
      await tx`
        INSERT INTO hw_audit_events (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail)
        VALUES (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role}, 'edit', 'alumni', ${data.studentId}, 'Student transitioned to alumni without deleting historical records')`;
    });
    return { ok: true as const };
  });
