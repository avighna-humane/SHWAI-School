import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth, requireRole } from "@/lib/auth";
import { consumeSecurityRateLimit, validateAttachment } from "@/lib/security";

// ── Types (exported for use in route files via `import type`) ─────────────────
export interface HomeworkRow {
  id: string;
  school_id: string;
  teacher_id: string;
  teacher_name: string;
  title: string;
  subject: string;
  class_id: string;
  class_label: string;
  section: string;
  description: string;
  due_date: string;
  total_marks: number;
  reference_material: string;
  status: string;
  created_at: string;
}

export interface SubmissionRow {
  id: string;
  homework_id: string;
  student_id: string;
  student_name: string;
  school_id: string;
  status: string;
  comment: string;
  file_name: string;
  file_size: number;
  file_type: string;
  file_data: string;
  submitted_at: string;
  reviewed_at: string | null;
  grade: number | null;
  feedback: string;
}

export type SubmissionWithHomework = SubmissionRow & {
  homework_title: string;
  homework_subject: string;
  homework_due_date: string;
  teacher_name: string;
  class_label: string;
};

// ── Server Functions (all db access via dynamic import to avoid client-bundle issues) ──

export const listHomework = createServerFn({ method: "POST" })
  .validator(z.object({ classId: z.string().trim().min(1).max(160).optional() }))
  .handler(async ({ data }) => {
    const context = await requireAuth();
    const { sql } = await import("@/lib/db");
    const schoolId = context.schoolId;
    const role = context.role;
    const userId = context.userId;
    const { classId } = data;
    if (role === "teacher") {
      return sql<HomeworkRow[]>`
        SELECT * FROM hw_homework WHERE school_id = ${schoolId} AND teacher_id = ${userId}
        ORDER BY created_at DESC`;
    }
    if (["principal", "admin", "owner"].includes(role)) {
      return sql<HomeworkRow[]>`
        SELECT * FROM hw_homework WHERE school_id = ${schoolId} ORDER BY created_at DESC`;
    }
    if (role === "student") {
      return sql<HomeworkRow[]>`
        SELECT h.* FROM hw_homework h
        JOIN hw_enrollments e ON e.class_id = h.class_id AND e.student_id = ${context.userId}
          AND e.school_id = ${context.schoolId} AND (h.section_id IS NULL OR e.section_id = h.section_id)
        WHERE h.school_id = ${context.schoolId} AND h.status = 'published'
          AND (h.assigned_student_id IS NULL OR h.assigned_student_id = ${context.userId})
        ORDER BY h.created_at DESC`;
    }
    if (role === "parent") {
      return sql<HomeworkRow[]>`
        SELECT DISTINCT h.* FROM hw_homework h
        JOIN hw_enrollments e ON e.class_id = h.class_id AND e.school_id = ${context.schoolId} AND (h.section_id IS NULL OR e.section_id = h.section_id)
        JOIN hw_parent_students ps ON ps.student_id = e.student_id AND ps.parent_id = ${context.userId} AND ps.school_id = ${context.schoolId} AND ps.active = TRUE
        WHERE h.school_id = ${context.schoolId} AND h.status = 'published'
        ORDER BY h.created_at DESC`;
    }
    return [] as HomeworkRow[];
  });

export const createHomework = createServerFn({ method: "POST" })
  .validator(
    z.object({
      title: z.string().trim().min(2).max(180),
      subject: z.string().trim().min(1).max(120),
      classId: z.string().trim().min(1).max(160),
      classLabel: z.string().trim().min(1).max(120),
      section: z.string().trim().max(120).default(""),
      description: z.string().trim().max(5000).default(""),
      dueDate: z.string().datetime(),
      totalMarks: z.number().int().positive().max(10000),
      referenceMaterial: z.string().trim().max(12000).default(""),
    }),
  )
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, ["teacher", "principal", "admin"]);
    const { sql } = await import("@/lib/db");
    if (context.role === "teacher") {
      const assignment = await sql`
        SELECT 1 FROM hw_teacher_assignments
        WHERE school_id = ${context.schoolId} AND teacher_id = ${context.userId} AND class_id = ${data.classId}
        LIMIT 1`;
      if (!assignment[0]) throw new Error("Teacher is not assigned to this class or subject");
    }
    const rows = await sql<HomeworkRow[]>`
      INSERT INTO hw_homework
        (school_id, teacher_id, teacher_name, title, subject, class_id, class_label, section,
         description, due_date, total_marks, reference_material)
      VALUES
        (${context.schoolId}, ${context.userId}, ${context.name}, ${data.title}, ${data.subject},
         ${data.classId}, ${data.classLabel}, ${data.section}, ${data.description}, ${data.dueDate},
         ${data.totalMarks}, ${data.referenceMaterial})
      RETURNING *`;
    await sql`INSERT INTO hw_audit_events (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail) VALUES (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role}, 'create', 'homework', ${rows[0]!.id}, 'Homework assignment created within an authorized class')`;
    return rows[0]!;
  });

export const deleteHomework = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().trim().min(1).max(160) }))
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, ["teacher", "principal", "admin"]);
    const { sql } = await import("@/lib/db");
    const rows = await sql<{ id: string }[]>`
      DELETE FROM hw_homework
      WHERE id = ${data.id} AND school_id = ${context.schoolId}
        AND (${context.role} <> 'teacher' OR teacher_id = ${context.userId})
      RETURNING id`;
    if (!rows[0]) throw new Error("Homework not found or not authorized");
    return { ok: true as const };
  });

export const submitHomework = createServerFn({ method: "POST" })
  .validator(
    z.object({
      homeworkId: z.string().trim().min(1).max(160),
      comment: z.string().trim().max(5000).default(""),
      fileName: z.string().max(180),
      fileSize: z.number().int(),
      fileType: z.string().max(120),
      fileData: z.string().max(7_000_000),
    }),
  )
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, ["student"]);
    const { sql } = await import("@/lib/db");
    const attachment = validateAttachment(data);
    await consumeSecurityRateLimit(sql, {
      scope: "homework_submit_user",
      subject: context.userId,
      limit: 30,
      windowSeconds: 60 * 60,
    });
    const homework = await sql<
      {
        due_date: string;
        class_id: string;
        section_id: string | null;
        status: string;
        total_marks: number;
      }[]
    >`
      SELECT due_date, class_id, section_id, status, total_marks FROM hw_homework WHERE id = ${data.homeworkId} AND school_id = ${context.schoolId}`;
    const assignment = homework[0];
    if (!assignment || assignment.status !== "published")
      throw new Error("Homework is not available for submission");
    const enrolled =
      await sql`SELECT 1 FROM hw_enrollments WHERE student_id = ${context.userId} AND school_id = ${context.schoolId} AND class_id = ${assignment.class_id} AND (${assignment.section_id} IS NULL OR section_id = ${assignment.section_id})`;
    if (!enrolled[0]) throw new Error("Student is not enrolled in the assigned class");
    const isLate = new Date() > new Date(assignment.due_date);
    const attempt = await sql<
      { next_attempt: number }[]
    >`SELECT COALESCE(MAX(attempt_no), 0) + 1 AS next_attempt FROM hw_submissions WHERE homework_id = ${data.homeworkId} AND student_id = ${context.userId}`;
    const rows = await sql<SubmissionRow[]>`
      INSERT INTO hw_submissions
        (homework_id, student_id, student_name, school_id, status, comment, content, file_name, file_size, file_type, file_data, attempt_no, is_late, grading_status, grade_published)
      VALUES
        (${data.homeworkId}, ${context.userId}, ${context.name}, ${context.schoolId},
         ${isLate ? "late" : "submitted"}, ${data.comment}, ${data.comment}, ${attachment.fileName}, ${attachment.fileSize}, ${attachment.fileType}, ${attachment.fileData}, ${attempt[0]!.next_attempt}, ${isLate}, 'pending', FALSE)
      RETURNING *`;
    await sql`INSERT INTO hw_audit_events (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail) VALUES (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role}, 'create', 'submission', ${rows[0]!.id}, 'Homework submission recorded with server-side enrollment and due-date checks')`;
    return rows[0]!;
  });

export const listStudentSubmissions = createServerFn({ method: "POST" })
  .validator(z.object({}))
  .handler(async () => {
    const context = await requireAuth();
    requireRole(context, ["student"]);
    const { sql } = await import("@/lib/db");
    return sql<SubmissionWithHomework[]>`
      SELECT s.*, h.title AS homework_title, h.subject AS homework_subject,
             h.due_date AS homework_due_date, h.teacher_name, h.class_label
      FROM hw_submissions s
      JOIN hw_homework h ON h.id = s.homework_id
      WHERE s.student_id = ${context.userId} AND s.school_id = ${context.schoolId}
      ORDER BY s.submitted_at DESC`;
  });

export const listAllSubmissions = createServerFn({ method: "POST" })
  .validator(z.object({}))
  .handler(async () => {
    const context = await requireAuth();
    requireRole(context, ["teacher", "principal", "admin", "owner"]);
    const { sql } = await import("@/lib/db");
    if (context.role === "teacher") {
      return sql<SubmissionWithHomework[]>`
        SELECT s.*, h.title AS homework_title, h.subject AS homework_subject,
               h.due_date AS homework_due_date, h.teacher_name, h.class_label
        FROM hw_submissions s JOIN hw_homework h ON h.id = s.homework_id
        WHERE h.school_id = ${context.schoolId} AND h.teacher_id = ${context.userId}
        ORDER BY s.submitted_at DESC LIMIT 200`;
    }
    return sql<SubmissionWithHomework[]>`
      SELECT s.*, h.title AS homework_title, h.subject AS homework_subject,
             h.due_date AS homework_due_date, h.teacher_name, h.class_label
      FROM hw_submissions s JOIN hw_homework h ON h.id = s.homework_id
      WHERE h.school_id = ${context.schoolId}
      ORDER BY s.submitted_at DESC LIMIT 200`;
  });

export const gradeSubmission = createServerFn({ method: "POST" })
  .validator(
    z.object({
      submissionId: z.string().trim().min(1).max(160),
      grade: z.number().int().min(0).nullable(),
      feedback: z.string().trim().max(5000).default(""),
    }),
  )
  .handler(async ({ data }) => {
    const context = await requireAuth();
    requireRole(context, ["teacher", "principal", "admin"]);
    const { sql } = await import("@/lib/db");
    const target = await sql<{ total_marks: number }[]>`
      SELECT h.total_marks FROM hw_submissions s JOIN hw_homework h ON h.id = s.homework_id
      WHERE s.id = ${data.submissionId} AND s.school_id = ${context.schoolId}`;
    if (!target[0]) throw new Error("Submission not found");
    if (data.grade !== null && (data.grade < 0 || data.grade > target[0].total_marks))
      throw new Error("Grade must be between zero and the assignment maximum");
    const rows = await sql<SubmissionRow[]>`
      UPDATE hw_submissions
      SET grade = ${data.grade}, feedback = ${data.feedback}, status = 'graded', reviewed_at = NOW()
      WHERE id = ${data.submissionId}
        AND homework_id IN (
          SELECT id FROM hw_homework
          WHERE school_id = ${context.schoolId}
            AND (${context.role} <> 'teacher' OR teacher_id = ${context.userId})
        )
      RETURNING *`;
    if (!rows[0]) throw new Error("Submission not found or not authorized");
    await sql`INSERT INTO hw_audit_events (school_id, actor_id, actor_name, actor_role, action, entity, entity_id, detail) VALUES (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role}, 'edit', 'submission_grade', ${data.submissionId}, 'Homework submission graded with server-side maximum-mark validation')`;
    return rows[0];
  });
